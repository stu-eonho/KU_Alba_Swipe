-- OWNER: 개발자 A 단독 — Phase 11 (전화번호 · 평가 사유 · 관심 의미 · 최저시급)
--
-- 실행: Supabase 대시보드 > SQL Editor 에 전체를 붙여넣고 Run.
--       schema_phase7.sql 다음입니다. additive 전용, 여러 번 실행해도 안전합니다.
--
-- ⚠️ 실행 전 확인 (3번 CHECK 가 기존 행에 걸리면 마이그레이션이 실패합니다):
--      select count(*) from jobs where hourly_wage < 10320;   -- 0 이어야 한다

-- ============================================================
-- 1. 전화번호
-- ============================================================
-- auth.users 는 REST 로 노출되지 않으므로 별도 테이블에 둡니다.
-- 프로필(seeker_profiles)에 넣지 않는 이유는 구인자에게도 전화번호가 필요하고,
-- 프로필은 구직자 전용이기 때문입니다.
create table if not exists user_contacts (
  user_id    uuid primary key references auth.users (id) on delete cascade default auth.uid(),
  -- 숫자 11자리만 저장합니다. 표시용 하이픈은 화면에서 붙입니다 —
  -- 저장 형식이 섞이면 비교와 중복 판정이 전부 흔들립니다.
  phone      text not null check (phone ~ '^010[0-9]{8}$'),
  updated_at timestamptz not null default now()
);

alter table user_contacts enable row level security;

drop policy if exists "own contact select" on user_contacts;
drop policy if exists "own contact insert" on user_contacts;
drop policy if exists "own contact update" on user_contacts;

-- 본인만. 남의 전화번호를 직접 SELECT 하는 경로는 만들지 않습니다 —
-- 매칭된 상대의 번호는 아래 matched_contact_v2 를 통해서만 나갑니다.
create policy "own contact select" on user_contacts for select using (auth.uid() = user_id);
create policy "own contact insert" on user_contacts for insert with check (auth.uid() = user_id);
create policy "own contact update" on user_contacts for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update on user_contacts to authenticated;
revoke all on user_contacts from anon;

-- ------------------------------------------------------------
-- 가입과 동시에 연락처 행을 만든다
-- ------------------------------------------------------------
-- CRITICAL: 앱에서 signUp 후 따로 insert 하면, 그 사이에 실패했을 때
-- 연락처 없는 계정이 남습니다. auth.users insert trigger 로 원자화합니다.
--
-- 형식이 틀리면 예외를 던져 가입 자체를 실패시킵니다. 반쪽짜리 계정을
-- 만들지 않는 쪽이 낫습니다.
create or replace function public.handle_new_user_contact()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_raw   text := new.raw_user_meta_data ->> 'phone';
  v_phone text;
begin
  -- 전화번호를 안 보낸 구버전 앱/기존 흐름은 그대로 통과시킵니다.
  -- 신규 가입 필수는 화면에서 강제하고, 여기서는 "보냈으면 올바를 것"만 봅니다.
  if v_raw is null or btrim(v_raw) = '' then
    return new;
  end if;

  -- 하이픈·공백을 떼고 숫자만 남깁니다. "010-1234-5678" 도 받습니다.
  v_phone := regexp_replace(v_raw, '[^0-9]', '', 'g');

  if v_phone !~ '^010[0-9]{8}$' then
    raise exception '전화번호 형식이 올바르지 않습니다';
  end if;

  insert into user_contacts (user_id, phone)
  values (new.id, v_phone)
  on conflict (user_id) do update set phone = excluded.phone, updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_contact on auth.users;
create trigger on_auth_user_created_contact
  after insert on auth.users
  for each row execute function public.handle_new_user_contact();

-- ============================================================
-- 2. 평가 사유
-- ============================================================
alter table seeker_ratings add column if not exists reason_codes text[] not null default '{}';
alter table seeker_ratings add column if not exists reason_other text;

-- PostgreSQL CHECK 식에는 서브쿼리를 직접 넣을 수 없습니다. 배열 중복 검사는
-- immutable 함수로 감싸야 마이그레이션과 이후 INSERT/UPDATE가 모두 동작합니다.
create or replace function public.text_array_has_unique_values(values_to_check text[])
returns boolean
language sql
immutable
parallel safe
strict
set search_path = pg_catalog
as $$
  select count(*) = count(distinct item_value)
  from unnest(values_to_check) as item(item_value)
$$;

-- 기존 행은 '{}' 로 남습니다. 수정 저장할 때부터 새 검증이 걸립니다.
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'seeker_ratings_reasons_check') then
    alter table seeker_ratings drop constraint seeker_ratings_reasons_check;
  end if;
end $$;

alter table seeker_ratings add constraint seeker_ratings_reasons_check
  check (
    -- 마이그레이션 전 행(빈 배열)은 그대로 통과시킵니다.
    cardinality(reason_codes) = 0
    or (
      cardinality(reason_codes) between 1 and 3
      -- 중복이 있으면 "3개"가 실제로는 1종류일 수 있습니다.
      and public.text_array_has_unique_values(reason_codes)
      and reason_codes <@ ARRAY[
        'reliable','relevant_experience','communication','schedule_fit',
        'friendly','quick_learner','teamwork','other'
      ]::text[]
      and (
        case
          when 'other' = any (reason_codes)
            then reason_other is not null and char_length(btrim(reason_other)) between 2 and 100
          else reason_other is null
        end
      )
    )
  );

-- ============================================================
-- 3. 최저시급을 DB 에서도 막는다
-- ============================================================
-- 화면 검증은 우회할 수 있지만 이건 못 합니다.
-- 2027년에 최저임금이 바뀌면 이 제약과 앱의 MIN_WAGE 상수를 함께 올려야 합니다.
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'jobs_hourly_wage_min_2026') then
    alter table jobs drop constraint jobs_hourly_wage_min_2026;
  end if;
end $$;

alter table jobs add constraint jobs_hourly_wage_min_2026 check (hourly_wage >= 10320);

-- ============================================================
-- 4. 매칭 연락처 v2 (이메일 + 전화번호)
-- ============================================================
-- 기존 matched_contact(text) 는 지우지 않습니다. 배포 중 구버전 번들이
-- 그걸 부르고 있을 수 있습니다.
--
-- CRITICAL: **양쪽** offers 가 right 일 때만 돌려줍니다.
-- 기존 matched_contact 는 한쪽만 있어도 통과했는데, 그러면 구인자가 관심을
-- 표시한 것만으로 상대 연락처를 가져갈 수 있습니다.
create or replace function public.matched_contact_v2(counterpart uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me      uuid := auth.uid();
  v_matched boolean;
  v_email   text;
  v_phone   text;
begin
  if v_me is null or counterpart is null or v_me = counterpart then
    return null;
  end if;

  -- 상호 관심: 내가 상대에게, 상대가 나에게 각각 right 가 있어야 합니다.
  -- offers 는 employer→seeker 한 방향만 쌓이므로, 반대 방향은 "그 구직자가
  -- 이 구인자의 공고에 지원했는가"로 봅니다 (지원 = 구직자의 관심 표시).
  select
    exists (
      select 1 from offers o
      where o.direction = 'right'
        and ((o.employer_id = v_me and o.seeker_id = counterpart)
          or (o.seeker_id = v_me and o.employer_id = counterpart))
    )
    and exists (
      select 1
      from applications a
      join jobs j on j.id = a.job_id
      where (a.user_id = counterpart and j.employer_id = v_me)
         or (a.user_id = v_me and j.employer_id = counterpart)
    )
  into v_matched;

  if not v_matched then
    return null;
  end if;

  select u.email into v_email from auth.users u where u.id = counterpart;
  select c.phone into v_phone from user_contacts c where c.user_id = counterpart;

  return jsonb_build_object('email', v_email, 'phone', v_phone);
end;
$$;

revoke all on function public.matched_contact_v2(uuid) from public, anon;
grant execute on function public.matched_contact_v2(uuid) to authenticated;

-- ============================================================
-- 5. 평가 저장 RPC (점수 + 사유를 한 번에)
-- ============================================================
-- 화면 검증을 우회해도 여기서 다시 걸립니다.
create or replace function public.rate_seeker_with_reasons(
  seeker uuid,
  score integer,
  reason_codes text[],
  reason_other text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me    uuid := auth.uid();
  v_other text := nullif(btrim(coalesce(reason_other, '')), '');
begin
  if v_me is null then
    raise exception '로그인이 필요합니다';
  end if;
  if score is null or score < 1 or score > 5 then
    raise exception '평점은 1~5 사이여야 합니다';
  end if;

  -- 내 공고에 지원한 사람만 평가할 수 있습니다.
  if not exists (
    select 1
    from applications a
    join jobs j on j.id = a.job_id
    where a.user_id = seeker and j.employer_id = v_me
  ) then
    raise exception '내 공고에 지원한 사람만 평가할 수 있습니다';
  end if;

  if 'other' = any (coalesce(reason_codes, '{}')) then
    if v_other is null or char_length(v_other) not between 2 and 100 then
      raise exception '직접 입력은 2~100자여야 합니다';
    end if;
  else
    v_other := null;
  end if;

  insert into seeker_ratings (employer_id, seeker_id, score, reason_codes, reason_other)
  values (v_me, seeker, score, coalesce(reason_codes, '{}'), v_other)
  on conflict (employer_id, seeker_id) do update
    set score = excluded.score,
        reason_codes = excluded.reason_codes,
        reason_other = excluded.reason_other;
end;
$$;

revoke all on function public.rate_seeker_with_reasons(uuid, integer, text[], text) from public, anon;
grant execute on function public.rate_seeker_with_reasons(uuid, integer, text[], text) to authenticated;

-- ============================================================
-- 6. "채용" → "관심": accepted 가 곧 offer right
-- ============================================================
-- 구인자가 지원서를 accepted 로 바꾸면 그 자체가 관심 표시입니다.
-- offers 에 right 를 넣으면 기존 on_offer_right() 가 관심/매칭 알림을 만듭니다.
create or replace function public.accepted_to_offer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_employer uuid;
begin
  if new.status <> 'accepted' then
    return new;
  end if;
  if old.status is not distinct from new.status then
    return new;
  end if;

  select j.employer_id into v_employer from jobs j where j.id = new.job_id;
  if v_employer is null then
    return new;
  end if;

  insert into offers (employer_id, seeker_id, job_id, direction)
  values (v_employer, new.user_id, new.job_id, 'right')
  on conflict (employer_id, seeker_id) do update
    set direction = 'right', job_id = excluded.job_id;

  return new;
end;
$$;

drop trigger if exists trg_accepted_to_offer on applications;
create trigger trg_accepted_to_offer
  after update of status on applications
  for each row execute function public.accepted_to_offer();

-- ------------------------------------------------------------
-- accepted 에 대한 "채용 확정" 알림은 더 이상 만들지 않는다
-- ------------------------------------------------------------
-- offer trigger 가 관심/매칭 알림을 만들므로, 그대로 두면 한 번의 동작에
-- 알림이 두 개 생깁니다. viewed·rejected 는 그대로 둡니다.
create or replace function public.notify_application_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store_name text;
  v_title      text;
  v_body       text;
begin
  if old.status is not distinct from new.status then
    return new;
  end if;

  -- accepted 는 offers trigger 가 "관심을 받았어요"/"매칭됐어요"로 알립니다.
  if new.status not in ('viewed', 'rejected') then
    return new;
  end if;

  select j.store_name into v_store_name from jobs j where j.id = new.job_id;

  if new.status = 'viewed' then
    v_title := '지원서를 확인했어요';
    v_body  := coalesce(v_store_name, '가게') || '에서 회원님의 지원서를 열어봤어요';
  else
    v_title := '지원 결과가 나왔어요';
    v_body  := coalesce(v_store_name, '가게') || '의 이번 지원은 아쉽게 마무리됐어요';
  end if;

  insert into notifications (
    recipient_id, actor_id, type, application_id, job_id, title, body, payload, dedupe_key
  ) values (
    new.user_id,
    auth.uid(),
    ('application_' || new.status)::text,
    new.id,
    new.job_id,
    left(v_title, 80),
    left(v_body, 240),
    jsonb_build_object('applicationId', new.id, 'jobId', new.job_id, 'status', new.status),
    'application:' || new.id::text || ':status:' || new.status
  )
  on conflict (dedupe_key) do nothing;

  return new;
end;
$$;

-- ============================================================
-- 7. 실행 후 확인
-- ============================================================
--   select count(*) from user_contacts;                          -- 0 이면 정상
--   select proname from pg_proc
--     where proname in ('matched_contact_v2','rate_seeker_with_reasons','accepted_to_offer');
--   select tgname from pg_trigger
--     where tgrelid = 'applications'::regclass and not tgisinternal;   -- accepted_to_offer 포함
--   select conname from pg_constraint
--     where conname in ('jobs_hourly_wage_min_2026','seeker_ratings_reasons_check');
