-- ⚠️ 데모를 막고 있는 문제 — 지금 실행해야 합니다
--
-- 증상: 사업자 계정으로 로그인해도 지원자가 **항상 0명**으로 보입니다.
--
-- 원인: 공고 25건 전부 employer_id 가 NULL 입니다. 시드로 넣은 공고라 주인이 없습니다.
--       사업자용 RLS 정책이 이렇게 생겼기 때문입니다:
--
--         create policy "employer reads apps" on applications for select using (
--           exists (select 1 from jobs j
--                   where j.id = applications.job_id and j.employer_id = auth.uid())
--         );
--
--       employer_id 가 NULL 이면 이 조건이 어떤 사용자에게도 참이 되지 않습니다.
--       코드 문제가 아니라 데이터 문제라 앱을 고쳐도 해결되지 않습니다.
--
-- ============================================================
-- 실행 순서
-- ============================================================
--
-- 1) 앱에서 **사업자(employer)로 회원가입**을 먼저 하세요. 계정이 없으면 아래가 아무것도 안 합니다.
--    (데모에서 쓸 계정으로 만드세요. 이메일/비번을 기록해 두세요.)
--
-- 2) Supabase 대시보드 > SQL Editor 에 이 파일을 붙여넣고 Run.
--
-- 3) 맨 아래 확인 쿼리로 25건이 전부 주인을 갖게 됐는지 봅니다.

-- ------------------------------------------------------------
-- 사업자 계정이 있는지 먼저 확인
-- ------------------------------------------------------------
select
  id,
  email,
  raw_user_meta_data ->> 'nickname' as nickname,
  raw_user_meta_data ->> 'role'     as role,
  created_at
from auth.users
order by created_at desc;
-- ↑ role 이 'employer' 인 행이 보여야 합니다. 없으면 1번(사업자 가입)을 먼저 하세요.


-- ------------------------------------------------------------
-- 주인 없는 공고를 가장 먼저 만든 사업자에게 전부 몰아줍니다.
-- UUID 를 손으로 복사하지 않습니다 — 옮겨 적다 틀리는 사고를 막습니다.
-- ------------------------------------------------------------
update jobs
set employer_id = (
  select id
  from auth.users
  where raw_user_meta_data ->> 'role' = 'employer'
  order by created_at
  limit 1
)
where employer_id is null;


-- ------------------------------------------------------------
-- 확인 — 아래가 0 이어야 합니다
-- ------------------------------------------------------------
select count(*) as "주인_없는_공고" from jobs where employer_id is null;

-- 어느 계정이 주인이 됐는지
select
  u.email,
  u.raw_user_meta_data ->> 'nickname' as nickname,
  count(j.id) as "보유_공고수"
from jobs j
join auth.users u on u.id = j.employer_id
group by u.email, u.raw_user_meta_data ->> 'nickname';


-- ============================================================
-- 사업자 계정을 여러 개 쓰고 싶다면 (선택)
-- ============================================================
-- 공고를 나눠 갖게 하려면 아래처럼 직종별로 나눌 수 있습니다.
--
-- update jobs set employer_id = '<두번째 사업자 uuid>'
-- where category in ('편의점', '판매');
