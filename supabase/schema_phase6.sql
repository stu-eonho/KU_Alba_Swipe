-- OWNER: 개발자 A 단독 — Phase 6 (공고 작성 · 회원탈퇴 · 아바타 · 평점)
--
-- 실행: Supabase 대시보드 > SQL Editor 에 전체를 붙여넣고 Run.
--       schema.sql → phase2 → phase3_ux → phase4 → phase5_availability 다음입니다.
-- additive 전용, 여러 번 실행해도 안전합니다.
--
-- ⚠️ 4번(아바타)은 Storage 버킷을 **먼저 만들어야** 합니다.
--    Storage > New bucket > 이름 avatars > Public 체크. 안 만들고 실행하면 4번만 실패합니다.

-- ============================================================
-- 1. 사업자가 공고를 직접 쓴다 (A-2)
-- ============================================================
-- 지금까지 jobs 에는 INSERT/UPDATE 정책이 없었습니다. 시드를 SQL Editor 로만
-- 넣었기 때문입니다. 사장님이 앱에서 공고를 쓰려면 열어야 합니다.
drop policy if exists "employer creates jobs" on jobs;
create policy "employer creates jobs" on jobs for insert
  with check (auth.uid() = employer_id);

drop policy if exists "employer updates own jobs" on jobs;
create policy "employer updates own jobs" on jobs for update
  using (auth.uid() = employer_id) with check (auth.uid() = employer_id);

-- DELETE 정책은 만들지 않습니다. 공고를 지우면 거기 달린 지원서·스와이프·알림이
-- cascade 로 함께 사라집니다. 데모 중 사고가 나면 복구할 방법이 없습니다.

-- 클라이언트가 employer_id 를 보내지 않아도 자기 것으로 들어가고,
-- 남의 id 를 보내면 위 with check 에 걸립니다.
alter table jobs alter column employer_id set default auth.uid();

grant insert, update on jobs to authenticated;

-- ============================================================
-- 2. 공고의 "이런 분을 찾아요" (A-5)
-- ============================================================
alter table jobs add column if not exists wanted_traits text[] not null default '{}';

do $$
begin
  if exists (select 1 from pg_constraint where conname = 'jobs_wanted_traits_check') then
    alter table jobs drop constraint jobs_wanted_traits_check;
  end if;
end $$;

-- 구직자 프로필의 personality_traits 와 **같은 목록**입니다.
-- 어휘가 갈리면 "성격이 맞는 사람" 이야기가 성립하지 않습니다.
alter table jobs add constraint jobs_wanted_traits_check
  check (
    array_length(wanted_traits, 1) is null
    or (
      array_length(wanted_traits, 1) <= 5
      and wanted_traits <@ ARRAY[
        '활발함','소심함','차분함','성실함','책임감','친절함',
        '긍정적','꼼꼼함','협업형','빠른 습득','체력 좋음','시간 약속'
      ]::text[]
    )
  );

-- ============================================================
-- 3. 회원탈퇴 (A-3)
-- ============================================================
-- Supabase 는 anon key 로 자기 계정을 지울 수 없습니다 (auth.admin 은 service_role 전용).
-- security definer 함수로 본인만 자기 행을 지우게 엽니다.
--
-- CRITICAL: auth.uid() 가 null 이면 즉시 예외를 냅니다. 이 검사가 없으면
-- 조건이 비어 delete 가 전체 사용자에 걸릴 수 있습니다.
-- search_path 를 박아 두는 이유는, 이 함수가 postgres 권한으로 돌기 때문입니다.
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception '로그인이 필요합니다';
  end if;

  -- seeker_profiles · swipes · applications · offers · user_availability ·
  -- notifications · seeker_ratings 는 전부 auth.users 를 on delete cascade 로
  -- 참조하므로 이 한 줄로 함께 지워집니다.
  delete from auth.users where id = v_uid;
end;
$$;

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;

-- ============================================================
-- 4. 아바타 Storage 정책 (A-4)
-- ============================================================
-- ⚠️ 먼저 Storage > New bucket > avatars > Public 체크로 버킷을 만드세요.
--
-- 경로 규칙: avatars/{user_id}/avatar.<ext>
-- 폴더 첫 조각이 uid 라 남의 폴더에는 쓸 수 없습니다.
drop policy if exists "own avatar upload"  on storage.objects;
drop policy if exists "own avatar update"  on storage.objects;
drop policy if exists "own avatar delete"  on storage.objects;
drop policy if exists "avatars are public" on storage.objects;

create policy "own avatar upload" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "own avatar update" on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 같은 파일 이름으로 다시 올릴 때 upsert 가 delete 를 거치는 경우가 있어 함께 엽니다.
create policy "own avatar delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars are public" on storage.objects for select
  using (bucket_id = 'avatars');

-- ============================================================
-- 5. 지원자 평점 (A-5)
-- ============================================================
create table if not exists seeker_ratings (
  employer_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  seeker_id   uuid not null references auth.users (id) on delete cascade,
  score       integer not null check (score between 1 and 5),
  comment     text,
  created_at  timestamptz default now(),
  -- 사장님 1명당 지원자 1명에 1회. 다시 매기면 덮어씁니다.
  primary key (employer_id, seeker_id)
);

create index if not exists seeker_ratings_seeker_idx on seeker_ratings (seeker_id);

alter table seeker_ratings enable row level security;

drop policy if exists "employer rates applicant" on seeker_ratings;
drop policy if exists "read ratings"             on seeker_ratings;

create policy "employer rates applicant" on seeker_ratings for all
  using (auth.uid() = employer_id) with check (auth.uid() = employer_id);

-- 평판이 목적이라 로그인한 사용자에게 공개합니다. 구직자 본인도 자기 점수를 봅니다 —
-- 숨기면 모르는 점수로 평가받는 구조가 되는데, 그건 의도한 바가 아닙니다.
create policy "read ratings" on seeker_ratings for select
  using (auth.uid() is not null);

grant select, insert, update on seeker_ratings to authenticated;

-- ============================================================
-- 6. 실행 후 확인
-- ============================================================
--   select polname from pg_policy where polrelid = 'jobs'::regclass;
--     -- employer creates jobs / employer updates own jobs 가 보여야 합니다
--   select column_name from information_schema.columns
--     where table_name = 'jobs' and column_name = 'wanted_traits';
--   select proname from pg_proc where proname = 'delete_own_account';
--   select count(*) from seeker_ratings;                    -- 0 이면 정상
--   select id, public from storage.buckets where id = 'avatars';  -- public = true
