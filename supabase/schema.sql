-- OWNER: 개발자 A 단독
--
-- Supabase Dashboard > SQL Editor 에 이 파일 전체를 붙여넣고 Run 하세요.
-- 그 다음 seed.sql 을 같은 방식으로 실행합니다.
--
-- ⚠️ 실행 전 반드시 확인:
--    Authentication > Providers > Email 에서 "Confirm email" 을 끄세요.
--    켜져 있으면 가입 직후 로그인이 막혀 데모가 불가능합니다.

-- ============================================================
-- 1. 테이블
-- ============================================================

create table jobs (
  id           uuid primary key default gen_random_uuid(),
  store_name   text not null,
  category     text not null,
  hourly_wage  integer not null,
  summary      text not null,
  description  text not null,
  address      text not null,
  work_days    text not null,
  work_hours   text not null,
  benefits     text[] default '{}',
  rating       numeric(2, 1) default 0,
  review_count integer default 0,
  image_url    text,
  created_at   timestamptz default now()
);

create table job_reviews (
  id          uuid primary key default gen_random_uuid(),
  job_id      uuid not null references jobs (id) on delete cascade,
  author_name text not null,
  rating      integer not null check (rating between 1 and 5),
  content     text not null,
  created_at  timestamptz default now()
);

create index on job_reviews (job_id);

-- 이 테이블 하나가 세 가지 역할을 합니다.
--   1. 덱 제외: 여기 행이 있는 공고는 홈에 다시 나오지 않는다 (좌/우 무관)
--   2. 찜 목록: direction = 'right' 인 행이 곧 찜이다 (별도 wishlist 테이블 없음)
--   3. 찜 해제: 행을 DELETE 하지 않고 direction 을 'left' 로 UPDATE 한다
--      (DELETE 하면 해제한 공고가 홈 덱에 다시 나타나 버그처럼 보인다)
create table swipes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade default auth.uid(),
  job_id     uuid not null references jobs (id) on delete cascade,
  direction  text not null check (direction in ('left', 'right')),
  created_at timestamptz default now(),
  unique (user_id, job_id)
);

create index on swipes (user_id, direction, created_at desc);

-- ============================================================
-- 2. Row Level Security
-- ============================================================
-- ⚠️ 백엔드 서버가 없으므로 RLS 가 유일한 보안 경계입니다.
--    anon key 는 브라우저 번들에 그대로 들어가고 누구나 읽을 수 있습니다.
--    RLS 가 없는 테이블은 전 세계에 공개된 테이블입니다.
--
--    실행 후 Table Editor 에서 세 테이블 모두 방패 아이콘이 켜져 있는지 눈으로 확인하세요.

alter table jobs        enable row level security;
alter table job_reviews enable row level security;
alter table swipes      enable row level security;

-- 공고와 리뷰는 모두에게 읽기만 허용합니다.
-- INSERT/UPDATE/DELETE 정책을 만들지 않는 것이 의도입니다.
-- 정책이 없으면 거부가 기본값이므로 앱에서 공고를 조작할 수 없습니다.
-- 시드는 SQL Editor(service_role)로 넣으므로 RLS 를 우회합니다.
create policy "jobs are public"    on jobs        for select using (true);
create policy "reviews are public" on job_reviews for select using (true);

-- 스와이프는 본인 것만.
-- user_id 컬럼 default 가 auth.uid() 이므로 클라이언트는 user_id 를 보내지 않습니다.
create policy "own swipes select" on swipes for select using (auth.uid() = user_id);
create policy "own swipes insert" on swipes for insert with check (auth.uid() = user_id);
create policy "own swipes update" on swipes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own swipes delete" on swipes for delete using (auth.uid() = user_id);

-- ============================================================
-- 3. applications (선택 — 스펙의 Q2 가 "실제 저장"으로 결정될 때만 실행)
-- ============================================================
-- 지원 기능을 버튼만 두기로 했다면 아래 블록은 실행하지 않습니다.
--
-- create table applications (
--   id         uuid primary key default gen_random_uuid(),
--   user_id    uuid not null references auth.users (id) on delete cascade default auth.uid(),
--   job_id     uuid not null references jobs (id) on delete cascade,
--   message    text,
--   created_at timestamptz default now(),
--   unique (user_id, job_id)
-- );
-- alter table applications enable row level security;
-- create policy "own apps select" on applications for select using (auth.uid() = user_id);
-- create policy "own apps insert" on applications for insert with check (auth.uid() = user_id);
