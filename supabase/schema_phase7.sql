-- OWNER: 개발자 A 단독 — Phase 7 (선호 가중치 · 지역 · 지원서 템플릿 · 공고 이미지)
--
-- 실행: Supabase 대시보드 > SQL Editor. schema_phase6.sql 다음입니다.
-- additive 전용이고 여러 번 실행해도 안전합니다.
--
-- ⚠️ 4번(공고 이미지)은 Storage 버킷을 먼저 만들어야 합니다.
--    Storage > New bucket > job-images > Public 체크.

-- ============================================================
-- 1. 선호 가중치 (F1 추천)
-- ============================================================
-- jsonb 희소 맵으로 둡니다. 46차원을 컬럼으로 펼치면 특징을 하나 추가할 때마다
-- 스키마를 바꿔야 하지만, 키-값이면 코드만 고치면 끝납니다.
--   { "cat:카페": 2.3, "wage:2": 1.1, "time:오후": 0.8 }
create table if not exists user_preferences (
  user_id    uuid primary key references auth.users (id) on delete cascade default auth.uid(),
  weights    jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

alter table user_preferences enable row level security;

drop policy if exists "own prefs" on user_preferences;
create policy "own prefs" on user_preferences for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on user_preferences to authenticated;

-- ============================================================
-- 2. 지역 (F2)
-- ============================================================
alter table jobs add column if not exists region text;

-- 기존 공고는 주소 첫 조각에서 채웁니다. "서울 성북구 안암로 145" → "서울"
update jobs set region = split_part(address, ' ', 1) where region is null or region = '';

-- 시드가 "서울특별시" 처럼 긴 이름을 쓴 경우를 짧은 이름으로 맞춥니다.
-- 화면의 REGIONS 상수가 짧은 이름이라, 길면 필터에 하나도 안 걸립니다.
update jobs set region = '서울' where region like '서울%';
update jobs set region = '경기' where region like '경기%';
update jobs set region = '인천' where region like '인천%';
update jobs set region = '부산' where region like '부산%';
update jobs set region = '대구' where region like '대구%';
update jobs set region = '대전' where region like '대전%';
update jobs set region = '광주' where region like '광주%';
update jobs set region = '울산' where region like '울산%';
update jobs set region = '세종' where region like '세종%';
update jobs set region = '강원' where region like '강원%';
update jobs set region = '충북' where region in ('충청북도', '충북');
update jobs set region = '충남' where region in ('충청남도', '충남');
update jobs set region = '전북' where region in ('전라북도', '전북');
update jobs set region = '전남' where region in ('전라남도', '전남');
update jobs set region = '경북' where region in ('경상북도', '경북');
update jobs set region = '경남' where region in ('경상남도', '경남');
update jobs set region = '제주' where region like '제주%';

create index if not exists jobs_region_idx on jobs (region);

-- ============================================================
-- 3. 지원서 템플릿 (F5)
-- ============================================================
create table if not exists apply_templates (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade default auth.uid(),
  title      text not null,
  body       text not null,
  created_at timestamptz default now()
);

create index if not exists apply_templates_user_idx on apply_templates (user_id, created_at desc);

alter table apply_templates enable row level security;

drop policy if exists "own templates" on apply_templates;
create policy "own templates" on apply_templates for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on apply_templates to authenticated;

-- ============================================================
-- 4. 공고 이미지 Storage 정책 (F6)
-- ============================================================
-- ⚠️ 먼저 Storage > New bucket > job-images > Public 체크로 버킷을 만드세요.
-- 경로: job-images/{user_id}/{uuid}.<ext> — 첫 조각이 uid 라 남의 폴더에 못 씁니다.
drop policy if exists "own job image upload" on storage.objects;
drop policy if exists "own job image update" on storage.objects;
drop policy if exists "own job image delete" on storage.objects;
drop policy if exists "job images are public" on storage.objects;

create policy "own job image upload" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'job-images' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "own job image update" on storage.objects for update to authenticated
  using (
    bucket_id = 'job-images' and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'job-images' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "own job image delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'job-images' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "job images are public" on storage.objects for select
  using (bucket_id = 'job-images');

-- ============================================================
-- 5. 실행 후 확인
-- ============================================================
--   select region, count(*) from jobs group by region order by count(*) desc;
--     -- 서울 외 지역이 보여야 지역 필터가 데모에서 살아납니다.
--     -- 전부 서울이면 seed_nationwide.sql 을 먼저 실행하세요.
--   select count(*) from user_preferences;   -- 0 이면 정상
--   select count(*) from apply_templates;    -- 0 이면 정상
--   select id, public from storage.buckets where id = 'job-images';
