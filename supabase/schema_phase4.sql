-- OWNER: 개발자 A 단독 — Phase 4 (가능 시간 · 상호 관심 · 연락처 공개)
--
-- 실행: Supabase 대시보드 > SQL Editor 에 이 파일 전체를 붙여넣고 Run.
--       schema.sql → schema_phase2.sql → schema_phase3_ux.sql 이 실행된 상태를 전제합니다.
--
-- additive 전용이고 여러 번 실행해도 안전합니다.
--
-- ⚠️ PHASE4_PLAN.md 3절의 SQL 에서 네 곳을 고쳤습니다. 원문 그대로 실행하면 실패합니다.
--    1) notifications 의 수신자 컬럼은 user_id 가 아니라 recipient_id 입니다
--    2) notifications.dedupe_key 는 NOT NULL UNIQUE 입니다. 원문은 이 값을 넣지 않아
--       첫 insert 에서 not-null 위반이 납니다
--    3) security definer 함수에 set search_path 가 없으면, search_path 를 바꿔치기한
--       호출자가 함수 안의 테이블 이름을 가로챌 수 있습니다
--    4) 트리거가 insert or update 양쪽에 걸려 있어 같은 알림이 두 번 생길 수 있습니다.
--       dedupe_key 로 막습니다

-- ============================================================
-- 1. 가능 시간
-- ============================================================
-- 분 단위 정수로 저장합니다. "13:00" 문자열로 두면 비교할 때마다 파싱해야 하고
-- 자정 넘김 처리가 지저분해집니다. 780 = 13 * 60.
create table if not exists user_availability (
  user_id   uuid not null references auth.users (id) on delete cascade default auth.uid(),
  day       text not null check (day in ('월', '화', '수', '목', '금', '토', '일')),
  start_min integer not null check (start_min between 0 and 1440),
  end_min   integer not null check (end_min between 0 and 1440),
  primary key (user_id, day)
);

alter table user_availability enable row level security;

drop policy if exists "own availability" on user_availability;
create policy "own availability" on user_availability for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on user_availability to authenticated;

-- ============================================================
-- 2. 알림 타입 확장
-- ============================================================
-- 기존 CHECK 를 갈아끼웁니다. 컬럼 삭제가 아니라 안전합니다.
alter table notifications drop constraint if exists notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (
    type in (
      'application_received', 'application_viewed', 'application_accepted',
      'application_rejected', 'system',
      'employer_interested',  -- 사장님이 관심 표시 → 구직자에게
      'mutual_match'          -- 양쪽 다 관심 → 양쪽에게
    )
  );

-- ============================================================
-- 3. 상호 매칭 감지 trigger
-- ============================================================
-- offers 에 right 가 들어올 때, 그 구직자가 이 사장님 공고에 이미 지원했으면
-- (= 구직자가 먼저 관심을 표시한 것) 양쪽에 매칭 알림을 만듭니다.
create or replace function public.on_offer_right()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_applied     boolean;
  v_seeker_name text;
  v_store       text;
begin
  if new.direction <> 'right' then
    return new;
  end if;

  select exists (
    select 1
    from applications a
    join jobs j on j.id = a.job_id
    where a.user_id = new.seeker_id and j.employer_id = new.employer_id
  ) into v_applied;

  select coalesce(nullif(btrim(nickname), ''), '지원자') into v_seeker_name
  from seeker_profiles where user_id = new.seeker_id;

  select store_name into v_store from jobs where id = new.job_id;

  if v_applied then
    -- 양쪽 다 관심 → 매칭. 수신자가 둘이라 dedupe_key 도 둘로 나눕니다.
    insert into notifications (recipient_id, actor_id, type, job_id, title, body, payload, dedupe_key)
    values
      (
        new.seeker_id, new.employer_id, 'mutual_match', new.job_id,
        '매칭됐어요!',
        left(coalesce(v_store, '사장님') || '에서도 회원님께 관심이 있어요. 연락해 보세요.', 240),
        jsonb_build_object('counterpartId', new.employer_id, 'jobId', new.job_id),
        'match:' || new.employer_id::text || ':' || new.seeker_id::text || ':seeker'
      ),
      (
        new.employer_id, new.seeker_id, 'mutual_match', new.job_id,
        '매칭됐어요!',
        left(coalesce(v_seeker_name, '지원자') || '님도 관심이 있어요. 연락해 보세요.', 240),
        jsonb_build_object('counterpartId', new.seeker_id, 'jobId', new.job_id),
        'match:' || new.employer_id::text || ':' || new.seeker_id::text || ':employer'
      )
    on conflict (dedupe_key) do nothing;
  else
    -- 사장님만 관심
    insert into notifications (recipient_id, actor_id, type, job_id, title, body, payload, dedupe_key)
    values (
      new.seeker_id, new.employer_id, 'employer_interested', new.job_id,
      '관심을 받았어요',
      left(coalesce(v_store, '한 사장님') || '에서 회원님 프로필을 관심 있게 봤어요.', 240),
      jsonb_build_object('counterpartId', new.employer_id, 'jobId', new.job_id),
      'offer:' || new.employer_id::text || ':' || new.seeker_id::text || ':interested'
    )
    on conflict (dedupe_key) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists offers_right_notify on offers;
create trigger offers_right_notify
  after insert or update on offers
  for each row execute function public.on_offer_right();

-- ============================================================
-- 4. 매칭 상대 이메일 조회 (채팅 대신)
-- ============================================================
-- auth.users 는 REST 로 노출되지 않습니다. 매칭된 상대의 이메일만 꺼내는 함수를 엽니다.
-- security definer 라 auth.users 를 읽을 수 있으므로, 조건을 틀리면 전체 이메일이 새어 나갑니다.
create or replace function public.matched_contact(counterpart uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  -- 호출자와 상대 사이에 실제로 오른쪽 스와이프가 있을 때만 공개합니다.
  if not exists (
    select 1 from offers o
    where o.direction = 'right'
      and (
        (o.employer_id = auth.uid() and o.seeker_id = counterpart)
        or (o.seeker_id = auth.uid() and o.employer_id = counterpart)
      )
  ) then
    return null;
  end if;

  select email into v_email from auth.users where id = counterpart;
  return v_email;
end;
$$;

-- anon 에는 주지 않습니다. 로그인하지 않은 사람이 부를 이유가 없습니다.
revoke all on function public.matched_contact(uuid) from public, anon;
grant execute on function public.matched_contact(uuid) to authenticated;

-- ============================================================
-- 5. 실행 후 확인
-- ============================================================
--   select count(*) from user_availability;                    -- 0 이면 정상
--   select tgname from pg_trigger
--   where tgrelid = 'offers'::regclass and not tgisinternal;    -- offers_right_notify
--
--   select count(*) from jobs where employer_id is null;        -- 0 이어야 한다
--   0 이 아니면 fix_employer_owner.sql 을 먼저 실행하세요.
