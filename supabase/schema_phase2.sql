-- OWNER: 개발자 A 단독 — Phase 2 (역할 · 프로필 · 지원 · 제안)
--
-- 실행: Supabase 대시보드 > SQL Editor 에 이 파일 전체를 붙여넣고 Run.
--       schema.sql 과 seed.sql, seed_more.sql 이 이미 실행된 상태를 전제합니다.
--
-- ⚠️ 블록 순서를 지켜 한 번에 실행하세요.
--    3번(seeker_profiles)의 "employer reads applicants" 정책이 4번(applications)
--    테이블을 참조합니다. 3번만 따로 돌리면 실패합니다.
--
-- ⚠️ 이 파일은 여러 번 실행해도 안전합니다 (if not exists / or replace / drop policy if exists).
--    데모 2시간 전부터는 스키마를 건드리지 않습니다. 컬럼 삭제·타입 변경 금지.

-- ============================================================
-- 1. 역할 (F2)
-- ============================================================
-- role 을 별도 테이블이 아니라 auth.users.user_metadata 에 둡니다.
-- 기존 nickname 과 같은 자리이고, JWT 에 실려 오므로 RLS 에서 바로 쓸 수 있습니다.
--   signUp({ options: { data: { nickname, role } } })
--
-- 이름을 app_current_role 로 둡니다. current_role 은 PostgreSQL 예약어라
-- public 스키마에 같은 이름을 만들면 호출 지점에서 파서와 충돌합니다.
create or replace function public.app_current_role()
returns text language sql stable as $$
  select coalesce(auth.jwt() -> 'user_metadata' ->> 'role', 'seeker')
$$;

grant execute on function public.app_current_role() to anon, authenticated;

-- ============================================================
-- 2. 공고 소유자 (F5)
-- ============================================================
alter table jobs add column if not exists employer_id uuid references auth.users (id) on delete cascade;
create index if not exists jobs_employer_idx on jobs (employer_id);

-- 시드 공고에는 주인이 없습니다. 데모용 사업자 계정을 만든 뒤 맨 아래 블록으로 몰아줍니다.

-- ============================================================
-- 3. 구직자 프로필 (F4)
-- ============================================================
create table if not exists seeker_profiles (
  user_id      uuid primary key references auth.users (id) on delete cascade default auth.uid(),
  -- 닉네임을 여기 복사해 둡니다. 원본은 auth.users.user_metadata 에 있지만
  -- auth 스키마는 API 로 노출되지 않아 사업자가 지원자 이름을 읽을 방법이 없습니다.
  nickname     text,
  intro        text,                -- 자기소개서 (가입 3단계에서 받는다)
  experience   text,                -- 경력 (자유 서술)
  interests    text[] default '{}', -- 관심 직종 — jobs.category 와 같은 값
  desired_wage integer,             -- 희망 시급
  avatar_url   text,                -- 지금은 항상 null. 화면은 이니셜 아바타로 그린다
  resume_url   text,                -- 지금은 항상 null (파일 업로드는 범위 밖)
  updated_at   timestamptz default now()
);

alter table seeker_profiles add column if not exists nickname text;

alter table seeker_profiles enable row level security;

drop policy if exists "own profile select"       on seeker_profiles;
drop policy if exists "own profile insert"       on seeker_profiles;
drop policy if exists "own profile update"       on seeker_profiles;
drop policy if exists "employer reads applicants" on seeker_profiles;

-- 본인은 읽고 쓴다
create policy "own profile select" on seeker_profiles for select using (auth.uid() = user_id);
create policy "own profile insert" on seeker_profiles for insert with check (auth.uid() = user_id);
create policy "own profile update" on seeker_profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update on seeker_profiles to authenticated;

-- ============================================================
-- 4. 지원 (F5)
-- ============================================================
create table if not exists applications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade default auth.uid(),
  job_id     uuid not null references jobs (id) on delete cascade,
  message    text,
  status     text not null default 'applied' check (status in ('applied', 'viewed', 'accepted', 'rejected')),
  created_at timestamptz default now(),
  unique (user_id, job_id)
);

create index if not exists applications_job_idx on applications (job_id, created_at desc);

alter table applications enable row level security;

drop policy if exists "own apps select"     on applications;
drop policy if exists "own apps insert"     on applications;
drop policy if exists "own apps update"     on applications;
drop policy if exists "employer reads apps" on applications;
drop policy if exists "employer updates apps" on applications;

create policy "own apps select" on applications for select using (auth.uid() = user_id);
create policy "own apps insert" on applications for insert with check (auth.uid() = user_id);
-- 재지원(같은 공고에 메시지를 고쳐 다시 제출)을 upsert 로 처리하려면 update 도 필요합니다.
create policy "own apps update" on applications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 사업자는 자기 공고의 지원서를 읽고 상태를 바꾼다
create policy "employer reads apps" on applications for select using (
  exists (select 1 from jobs j where j.id = applications.job_id and j.employer_id = auth.uid())
);
create policy "employer updates apps" on applications for update using (
  exists (select 1 from jobs j where j.id = applications.job_id and j.employer_id = auth.uid())
);

grant select, insert, update on applications to authenticated;

-- CRITICAL: 사업자는 "자기 공고에 지원한 사람"의 프로필만 볼 수 있습니다.
-- 이 정책이 없으면 브라우저에 그대로 들어 있는 anon key 로 전체 구직자 프로필이 열립니다.
-- applications 를 참조하므로 4번 블록 뒤에 둡니다.
create policy "employer reads applicants" on seeker_profiles for select using (
  exists (
    select 1
    from applications a
    join jobs j on j.id = a.job_id
    where a.user_id = seeker_profiles.user_id
      and j.employer_id = auth.uid()
  )
);

-- ============================================================
-- 5. 사업자 → 구직자 스와이프 (F7)
-- ============================================================
-- F7 은 컷 후보지만, 나중에 추가하는 것보다 지금 한 번에 만들어 두는 편이 안전합니다.
create table if not exists offers (
  id          uuid primary key default gen_random_uuid(),
  employer_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  seeker_id   uuid not null references auth.users (id) on delete cascade,
  job_id      uuid references jobs (id) on delete set null,
  direction   text not null check (direction in ('left', 'right')),
  created_at  timestamptz default now(),
  unique (employer_id, seeker_id)
);

create index if not exists offers_seeker_idx on offers (seeker_id, direction);

alter table offers enable row level security;

drop policy if exists "employer own offers" on offers;
drop policy if exists "seeker reads offers" on offers;

create policy "employer own offers" on offers for all
  using (auth.uid() = employer_id) with check (auth.uid() = employer_id);

-- 구직자는 자기가 받은 'right' 제안만 봅니다
create policy "seeker reads offers" on offers for select
  using (auth.uid() = seeker_id and direction = 'right');

grant select, insert, update, delete on offers to authenticated;

-- ============================================================
-- 6. 데모 사업자에게 시드 공고 몰아주기 — 앱에서 가입한 뒤 실행
-- ============================================================
-- 앱에서 employer 역할로 가입한 다음, 그 계정의 uuid 를 확인하고 아래를 실행합니다.
--
--   select id, email, raw_user_meta_data ->> 'role' as role
--   from auth.users
--   order by created_at desc
--   limit 5;
--
--   update jobs set employer_id = '<위에서 확인한 uuid>' where employer_id is null;
--
-- 확인:
--   select count(*) from jobs where employer_id is null;   -- 0 이어야 한다
