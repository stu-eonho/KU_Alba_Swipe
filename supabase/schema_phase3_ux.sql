-- OWNER: 개발자 A 단독 — Phase 3 (프로필 확장 · 인앱 알림)
--
-- 실행: Supabase 대시보드 > SQL Editor 에 이 파일 전체를 붙여넣고 Run.
--       schema.sql → schema_phase2.sql 이 이미 실행된 상태를 전제합니다.
--
-- 이 파일은 additive 입니다. 기존 schema.sql / schema_phase2.sql 을 고치거나
-- 다시 실행할 필요가 없습니다. 여러 번 실행해도 안전합니다.
--
-- 적용 순서: DB 먼저, 앱 배포는 그 다음.
--   새 컬럼과 테이블이 전부 additive 라서 그 사이에도 현재 앱은 그대로 돕니다.
--   다만 그 구간에는 구버전 앱이 중복 지원을 upsert 로 계속 덮어씁니다.
--   마이그레이션 직후 앱을 이어서 배포하세요.

-- ============================================================
-- 1. 프로필 확장 — MBTI · 성격 키워드
-- ============================================================
alter table seeker_profiles add column if not exists mbti text;
alter table seeker_profiles add column if not exists personality_traits text[] not null default '{}';

-- 기존 행은 mbti = null, personality_traits = '{}' 로 즉시 호환됩니다. 백필하지 않습니다.

-- 허용값을 DB 에서도 막습니다. 화면 검증은 우회할 수 있지만 이건 못 합니다.
-- 제약을 새로 걸기 전에 같은 이름이 있으면 지웁니다 (재실행 가능하게).
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'seeker_profiles_mbti_check') then
    alter table seeker_profiles drop constraint seeker_profiles_mbti_check;
  end if;
end $$;

alter table seeker_profiles add constraint seeker_profiles_mbti_check
  check (
    mbti is null or mbti in (
      'INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP',
      'ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP'
    )
  );

do $$
begin
  if exists (select 1 from pg_constraint where conname = 'seeker_profiles_traits_check') then
    alter table seeker_profiles drop constraint seeker_profiles_traits_check;
  end if;
end $$;

-- 최대 5개 + 고정 목록 밖의 값 금지.
-- <@ 는 "왼쪽 배열이 오른쪽에 포함된다" 입니다.
alter table seeker_profiles add constraint seeker_profiles_traits_check
  check (
    array_length(personality_traits, 1) is null
    or (
      array_length(personality_traits, 1) <= 5
      and personality_traits <@ ARRAY[
        '활발함','소심함','차분함','성실함','책임감','친절함',
        '긍정적','꼼꼼함','협업형','빠른 습득','체력 좋음','시간 약속'
      ]::text[]
    )
  );

-- ============================================================
-- 2. 알림 테이블
-- ============================================================
create table if not exists notifications (
  id             uuid primary key default gen_random_uuid(),
  recipient_id   uuid not null references auth.users (id) on delete cascade,
  actor_id       uuid references auth.users (id) on delete set null,
  type           text not null check (
                   type in ('application_received', 'application_viewed',
                            'application_accepted', 'application_rejected', 'system')
                 ),
  application_id uuid references applications (id) on delete cascade,
  job_id         uuid references jobs (id) on delete cascade,
  title          text not null,
  body           text not null,
  -- 확장 지점. 이후 채팅·새 공고·채용 제안이 여기에 route params 를 싣습니다.
  payload        jsonb not null default '{}'::jsonb,
  -- null 이면 읽지 않음
  read_at        timestamptz,
  created_at     timestamptz not null default now(),
  -- 같은 이벤트가 다시 실행돼도 행이 하나만 남습니다.
  dedupe_key     text not null unique
);

create index if not exists notifications_recipient_created_idx
  on notifications (recipient_id, created_at desc);

create index if not exists notifications_unread_idx
  on notifications (recipient_id, created_at desc)
  where read_at is null;

-- ============================================================
-- 3. 알림 RLS
-- ============================================================
alter table notifications enable row level security;

drop policy if exists "own notifications select" on notifications;
drop policy if exists "own notifications read"   on notifications;

create policy "own notifications select" on notifications
  for select using (auth.uid() = recipient_id);

-- 읽음 처리만 허용합니다. recipient_id·type·title·payload 를 바꾸는 경로는 주지 않습니다.
create policy "own notifications read" on notifications
  for update using (auth.uid() = recipient_id) with check (auth.uid() = recipient_id);

-- INSERT / DELETE 정책을 만들지 않는 것이 의도입니다.
-- 정책이 없으면 거부가 기본값이라, 알림은 오직 아래 trigger 로만 생깁니다.
-- 클라이언트가 임의의 제목으로 남에게 알림을 보낼 수 없습니다.

-- CRITICAL: UPDATE 를 read_at 한 컬럼으로 묶는 것은 RLS 가 아니라 컬럼 GRANT 입니다.
-- RLS 정책은 "어떤 행" 인지만 정할 수 있고 "어떤 컬럼" 인지는 정하지 못합니다.
-- 테이블 전체에 update 를 주면 본인 알림의 title 이나 payload 를 바꿀 수 있게 됩니다.
grant select on notifications to authenticated;
grant update (read_at) on notifications to authenticated;

-- ============================================================
-- 4. 알림 생성 trigger
-- ============================================================
-- security definer 로 두는 이유: 알림 INSERT 정책이 없어서, 호출한 사용자의
-- 권한으로는 행을 넣을 수 없기 때문입니다. 고정 SQL 만 실행하고 search_path 를
-- 박아 둡니다 — 그러지 않으면 search_path 를 바꿔치기한 호출자가
-- 함수 안의 테이블 이름을 가로챌 수 있습니다.

-- 지원서가 들어오면 공고 주인에게 알립니다.
create or replace function public.notify_application_received()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_employer_id uuid;
  v_store_name  text;
  v_nickname    text;
begin
  select j.employer_id, j.store_name into v_employer_id, v_store_name
  from jobs j where j.id = new.job_id;

  -- 주인 없는 공고(시드 초기 상태)면 받을 사람이 없습니다. 조용히 넘어갑니다.
  if v_employer_id is null then
    return new;
  end if;

  select coalesce(nullif(btrim(sp.nickname), ''), '지원자') into v_nickname
  from seeker_profiles sp where sp.user_id = new.user_id;

  insert into notifications (
    recipient_id, actor_id, type, application_id, job_id, title, body, payload, dedupe_key
  ) values (
    v_employer_id,
    new.user_id,
    'application_received',
    new.id,
    new.job_id,
    -- title 80자 / body 240자 상한을 여기서 강제합니다.
    left('새 지원자가 있어요', 80),
    left(coalesce(v_nickname, '지원자') || '님이 ' || coalesce(v_store_name, '공고') || '에 지원했어요', 240),
    jsonb_build_object('applicationId', new.id, 'jobId', new.job_id),
    'application:' || new.id::text || ':received'
  )
  on conflict (dedupe_key) do nothing;

  return new;
end;
$$;

-- 상태가 바뀌면 지원자에게 알립니다.
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
  -- 같은 값으로 다시 저장한 경우에는 알림을 만들지 않습니다.
  if old.status is not distinct from new.status then
    return new;
  end if;

  if new.status not in ('viewed', 'accepted', 'rejected') then
    return new;
  end if;

  select j.store_name into v_store_name from jobs j where j.id = new.job_id;

  if new.status = 'viewed' then
    v_title := '지원서를 확인했어요';
    v_body  := coalesce(v_store_name, '가게') || '에서 회원님의 지원서를 열어봤어요';
  elsif new.status = 'accepted' then
    v_title := '채용이 확정됐어요';
    v_body  := coalesce(v_store_name, '가게') || '에서 회원님을 채용했어요';
  else
    v_title := '지원 결과가 나왔어요';
    v_body  := coalesce(v_store_name, '가게') || '의 이번 채용은 아쉽게 마무리됐어요';
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

drop trigger if exists trg_notify_application_received on applications;
create trigger trg_notify_application_received
  after insert on applications
  for each row execute function public.notify_application_received();

drop trigger if exists trg_notify_application_status on applications;
create trigger trg_notify_application_status
  after update of status on applications
  for each row execute function public.notify_application_status();

-- ============================================================
-- 5. 실행 후 확인
-- ============================================================
-- 컬럼 · 테이블
--   select column_name from information_schema.columns
--   where table_name = 'seeker_profiles' and column_name in ('mbti','personality_traits');
--   select count(*) from notifications;            -- 0 이어야 정상
--
-- trigger
--   select tgname from pg_trigger where tgrelid = 'applications'::regclass and not tgisinternal;
--
-- CRITICAL: 공고 주인이 없으면 사업자 알림의 수신자를 정할 수 없습니다.
--   select count(*) from jobs where employer_id is null;   -- 0 이어야 한다
--   0 이 아니면 schema_phase2.sql 6번 블록을 먼저 실행하세요.
