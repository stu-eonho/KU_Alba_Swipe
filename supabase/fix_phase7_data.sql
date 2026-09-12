-- OWNER: 개발자 A — 데이터 점검에서 나온 문제 3건 수정
--
-- 실행: Supabase 대시보드 > SQL Editor. 위에서부터 한 번에 실행하세요.
-- 스키마 변경은 없습니다. 데이터만 고칩니다.

-- ============================================================
-- 1. 주인 없는 공고 35건 (가장 중요)
-- ============================================================
-- 증상: 구인자로 로그인해도 이 공고들의 지원자가 보이지 않고,
--       지원해도 구인자에게 알림이 가지 않으며, 매칭도 성립하지 않습니다.
--
-- 원인: seed_nationwide.sql 이 employer_id 를 채우지 않았습니다.
--       fix_employer_owner.sql 은 그 전에 실행돼서 기존 25건만 처리했습니다.
--       알림 trigger 는 employer_id 가 null 이면 조용히 건너뜁니다 —
--       에러가 없어서 눈치채기 어렵습니다.
--
-- 영향: 덱 상위 20건 중 11건이 여기 해당했습니다. 데모에서 구직자가 지원한
--       공고가 하필 주인 없는 쪽이면 구인자 화면이 빈 채로 남습니다.

-- 공고를 가장 많이 가진 계정에게 몰아줍니다.
-- "가장 먼저 만든 구인자"가 아니라 "이미 주인인 계정"을 고르는 이유는,
-- 검증하면서 만든 테스트 구인자 계정이 더 먼저 생성됐을 수 있기 때문입니다.
update jobs
set employer_id = (
  select employer_id
  from jobs
  where employer_id is not null
  group by employer_id
  order by count(*) desc
  limit 1
)
where employer_id is null;

-- 확인 — 0 이어야 합니다
-- select count(*) from jobs where employer_id is null;

-- ============================================================
-- 2. 테스트로 만들어진 쓰레기 공고 2건
-- ============================================================
-- 공고 작성 폼을 시험하면서 들어간 것으로 보입니다.
--   "alpja"  주소 "alpha"  → region 이 'alpha' 라 어떤 지역 필터에도 안 걸립니다
--   "gamma"  주소 "gamma"  → region 이 null 이라 마찬가지입니다
-- 둘 다 덱에 카드로 뜹니다. 심사위원이 보게 됩니다.
--
-- ⚠️ 되돌릴 수 없습니다. 지우면 달린 지원서·스와이프·알림도 cascade 로 사라집니다.
--    지우기 전에 아래로 무엇이 지워지는지 먼저 보세요.
--
--   select id, store_name, address, region, created_at
--   from jobs where store_name in ('alpja', 'gamma');

delete from jobs where store_name in ('alpja', 'gamma');

-- 검증용으로 만든 공고도 함께 정리합니다.
delete from jobs where store_name like 'E2E테스트카페-%';

-- ============================================================
-- 3. 앞으로 들어올 공고의 region 을 비지 않게
-- ============================================================
-- 앱의 공고 작성 폼은 주소에서 region 을 뽑아 함께 넣습니다.
-- 다만 SQL 로 직접 넣거나 구버전 앱에서 들어온 행은 비어 있을 수 있습니다.
-- 비어 있으면 어떤 지역 필터에도 걸리지 않으므로 주소에서 채워 둡니다.
update jobs
set region = split_part(address, ' ', 1)
where region is null or btrim(region) = '';

-- ============================================================
-- 4. 실행 후 확인
-- ============================================================
--   select count(*) from jobs where employer_id is null;        -- 0
--   select count(*) from jobs where region is null or region = '';  -- 0
--   select region, count(*) from jobs group by region order by 2 desc;
--     -- 17개 시·도만 나와야 합니다. 'alpha' 같은 값이 남아 있으면 그 공고를 지우세요.
--   select count(*) from jobs;                                   -- 정리 후 59 예상
