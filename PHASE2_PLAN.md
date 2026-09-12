# Phase 2 작업 분담 — 사업자 기능 · 프로필 · 튜토리얼

작성 13:45 · **마감까지 4시간 45분** (18:30 기준)

---

## 먼저 읽을 것 — 이 문서를 위에서부터 하는 이유

요청된 7개 기능의 총량은 **약 8~9인시**입니다. 남은 개발 용량은 개발자 2명 × 4시간 45분 = 9.5인시인데, 여기서 **통합·리허설·배포 확인에 최소 1시간**을 빼야 합니다. 실질 8.5인시.

숫자상 아슬아슬하고, **경험상 이런 계산은 항상 틀립니다.** 그래서 이 문서는 기능을 **의존성 순서 + 데모 가치 순**으로 배열했습니다.

> **위에서부터 하세요. 어디서 멈추든 데모가 성립합니다.**
> 아래에서부터 하면 절반쯤에서 "아무것도 안 되는 절반"이 남습니다.

**기능 동결: 17:30.** 그 이후는 버그 수정과 리허설만. 이건 협상 대상이 아닙니다.

---

## 기능 목록과 컷 라인

| # | 기능 | A | B | 합계 | 판정 |
|---|------|---|---|------|------|
| **F0** | 공고 25건 시드 투입 | 5분 | — | **5분** | 🟢 즉시 |
| **F1** | 홈에서 카드 탭 → 상세보기 | — | 30분 | **30분** | 🟢 필수 |
| **F2** | 가입 시 역할 선택(구직자/사업자) + 역할별 화면 분기 | 50분 | 40분 | **1.5h** | 🟢 필수 — F4·F5의 전제 |
| **F3** | 개인정보 동의 + 자기소개서 단계 | 40분 | 20분 | **1h** | 🟢 필수 |
| **F4** | 프로필 설정 (경력·관심·자기소개) | 50분 | 50분 | **1.7h** | 🟡 F5가 여기에 의존 |
| **F5** | 사업자: 지원자 목록 + 프로필 열람 | 1h | 50분 | **1.9h** | 🟡 사업자 기능의 핵심 |
| **F6** | 가입 직후 튜토리얼 (X 스킵 / 다음) | — | 40분 | **40분** | 🟡 심사 인상 좋음 |
| **F7** | 사업자가 구직자를 스와이프 → 채용 제안 | 1h | 1h | **2h** | 🔴 **컷 후보 1순위** |
| — | 사진·이력서 파일 업로드 | — | — | — | 🔴 **하지 않음** |

**🟢 F0~F3 = 4시간**(2명 병렬로 2시간). 여기까지는 반드시 됩니다.
**🟡 F4~F6 = 4.3시간**(병렬 2.2시간). 여기까지 가면 성공.
**🔴 F7**은 F4가 끝나야 시작할 수 있습니다. **16:30까지 F4~F6이 안 끝나면 F7은 버립니다.**

### 왜 파일 업로드를 하지 않는가

사진·이력서 업로드는 Supabase Storage 버킷 + RLS 정책 + presigned URL + 이미지 리사이즈 + 업로드 실패 처리가 붙습니다. 최소 1.5인시이고, **데모에서 보여주는 그림은 "사진이 있는 프로필" 한 장**입니다. 같은 그림을 기본 아바타(이니셜)로도 만들 수 있습니다.

대신 **프로필에 사진 자리는 만들어 둡니다.** 심사위원에게는 완성된 화면으로 보이고, 나중에 Storage만 붙이면 됩니다.

---

## F0 · 공고 25건 시드 (A, 5분) — 지금 당장

현재 공고가 **3건**입니다. 두 번 스와이프하면 덱이 빕니다.

```
Supabase 대시보드 → SQL Editor → New query
→ supabase/seed_more.sql 전체 붙여넣기 → Run
```

확인: `select count(*) from jobs;` → **25**, `select count(*) from job_reviews;` → **51**

이미지 URL 11개는 전부 실제 200 응답을 확인했습니다. 깨진 이미지가 카드에 뜨는 일은 없습니다.

---

## DB 변경 — A가 가장 먼저 할 일

F2 이후 전부가 여기에 막힙니다. **다른 어떤 것보다 먼저, 한 번에 실행하세요.**

`supabase/schema_phase2.sql` 로 저장하고 SQL Editor에서 실행합니다.

```sql
-- ============================================================
-- 1. 역할 (F2)
-- ============================================================
-- auth.users.user_metadata 에 role 을 넣는다. 별도 테이블을 만들지 않는 이유는
-- 기존 nickname 과 같은 자리이고, JWT 에 실려와 RLS 에서 바로 쓸 수 있기 때문이다.
--   signUp({ options: { data: { nickname, role } } })
--   role: 'seeker' | 'employer'
--
-- 기존 계정은 role 이 없다. 없으면 'seeker' 로 간주한다(아래 헬퍼).
create or replace function public.current_role()
returns text language sql stable as $$
  select coalesce(auth.jwt() -> 'user_metadata' ->> 'role', 'seeker')
$$;

-- ============================================================
-- 2. 공고 소유자 (F5) — 사업자가 "내 공고"를 알아야 한다
-- ============================================================
alter table jobs add column if not exists employer_id uuid references auth.users(id) on delete cascade;
create index if not exists jobs_employer_idx on jobs (employer_id);

-- 시드 공고에는 주인이 없다. 데모용 사업자 계정을 만든 뒤 아래로 몰아준다:
--   update jobs set employer_id = '<사업자 계정 uuid>' where employer_id is null;

-- ============================================================
-- 3. 구직자 프로필 (F4)
-- ============================================================
create table if not exists seeker_profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  intro        text,                    -- 자기소개서 (F3 가입 단계에서 받는다)
  experience   text,                    -- 경력 (자유 서술)
  interests    text[] default '{}',     -- 관심 직종 — jobs.category 와 같은 값을 쓴다
  desired_wage integer,                 -- 희망 시급
  avatar_url   text,                    -- 지금은 항상 null. 화면은 이니셜 아바타로 그린다
  resume_url   text,                    -- 지금은 항상 null (파일 업로드는 범위 밖)
  updated_at   timestamptz default now()
);

alter table seeker_profiles enable row level security;

-- 본인은 읽고 쓴다
create policy "own profile select" on seeker_profiles for select using (auth.uid() = user_id);
create policy "own profile insert" on seeker_profiles for insert with check (auth.uid() = user_id);
create policy "own profile update" on seeker_profiles for update using (auth.uid() = user_id);

-- CRITICAL: 사업자는 "자기 공고에 지원한 사람"의 프로필만 볼 수 있다.
-- 이 정책이 없으면 anon key 로 전체 구직자 프로필이 열린다.
create policy "employer reads applicants" on seeker_profiles for select using (
  exists (
    select 1 from applications a
    join jobs j on j.id = a.job_id
    where a.user_id = seeker_profiles.user_id
      and j.employer_id = auth.uid()
  )
);

grant select, insert, update on seeker_profiles to authenticated;

-- ============================================================
-- 4. 지원 (F5)
-- ============================================================
create table if not exists applications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade default auth.uid(),
  job_id     uuid not null references jobs(id) on delete cascade,
  message    text,
  status     text not null default 'applied' check (status in ('applied','viewed','accepted','rejected')),
  created_at timestamptz default now(),
  unique (user_id, job_id)
);
create index if not exists applications_job_idx on applications (job_id, created_at desc);

alter table applications enable row level security;

create policy "own apps select" on applications for select using (auth.uid() = user_id);
create policy "own apps insert" on applications for insert with check (auth.uid() = user_id);

-- 사업자는 자기 공고의 지원서를 읽고, 상태를 바꾼다
create policy "employer reads apps" on applications for select using (
  exists (select 1 from jobs j where j.id = applications.job_id and j.employer_id = auth.uid())
);
create policy "employer updates apps" on applications for update using (
  exists (select 1 from jobs j where j.id = applications.job_id and j.employer_id = auth.uid())
);

grant select, insert, update on applications to authenticated;

-- ============================================================
-- 5. 사업자 → 구직자 스와이프 (F7). F7 을 버리면 이 블록은 실행하지 않는다
-- ============================================================
create table if not exists offers (
  id          uuid primary key default gen_random_uuid(),
  employer_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  seeker_id   uuid not null references auth.users(id) on delete cascade,
  job_id      uuid references jobs(id) on delete set null,
  direction   text not null check (direction in ('left','right')),
  created_at  timestamptz default now(),
  unique (employer_id, seeker_id)
);
create index if not exists offers_seeker_idx on offers (seeker_id, direction);

alter table offers enable row level security;

create policy "employer own offers" on offers for all
  using (auth.uid() = employer_id) with check (auth.uid() = employer_id);
-- 구직자는 자기가 받은 'right' 제안만 본다
create policy "seeker reads offers" on offers for select
  using (auth.uid() = seeker_id and direction = 'right');

grant select, insert, update, delete on offers to authenticated;
```

> **주의 — 순서 의존**: `seeker_profiles` 의 "employer reads applicants" 정책이 `applications` 테이블을 참조합니다. 위 순서 그대로 한 번에 실행하면 문제없지만, 3번만 따로 돌리면 실패합니다.

> **되돌릴 수 없습니다.** 발표 2시간 전(16:30) 이후로는 스키마를 건드리지 마세요. 컬럼 삭제·타입 변경은 절대 금지.

---

## 🅰️ 개발자 A — 데이터 · 인증 · 사업자 백엔드

소유 경로는 그대로입니다: `supabase/` · `src/lib/` · `src/hooks/` · `src/features/{auth,settings}/` · `src/pages/{Login,Signup,Settings}Page.tsx`

**새로 소유할 것**: `src/features/employer/` (사업자 데이터 훅), `src/pages/EmployerApplicantsPage.tsx`

### A-1 · F0 시드 투입 (5분) — 지금
위 F0 절 그대로.

### A-2 · DB 변경 실행 (15분) — 그다음
위 `schema_phase2.sql` 블록 1~4 실행. **F7을 할지 모르면 5번(offers)도 같이 실행하세요** — 나중에 추가하는 것보다 지금이 안전합니다.

실행 후 **데모용 사업자 계정을 하나 만들고** 시드 공고 25건의 주인으로 지정합니다:
```sql
-- 앱에서 employer 로 가입한 뒤 그 uuid 를 확인
select id, email, raw_user_meta_data from auth.users order by created_at desc limit 5;
update jobs set employer_id = '<위에서 확인한 uuid>' where employer_id is null;
```

### A-3 · F2 역할 (50분)
- `signUp()` 에 `role` 추가. `AppUser` 타입에 `role: 'seeker' | 'employer'` 추가 → **`src/types.ts` 단독 커밋 + 즉시 공지** (B가 라우터 분기에 이걸 씁니다)
- `useAuth()` 가 `role` 을 노출. role 없는 기존 계정은 `'seeker'` 로 취급
- 회원가입 화면 1단계에 역할 선택 UI (B의 `Chip` 두 개면 충분)

### A-4 · F3 동의 + 자기소개서 (40분)
가입을 3단계로 나눕니다. **단계 상태는 A가 `SignupPage` 안에서 들고 있습니다** — 라우터를 늘리지 않습니다(B 소유 파일이라 협의가 필요해집니다).
1. 이메일·비밀번호·닉네임 + **역할 선택**
2. **개인정보 활용 동의** 체크 (필수 1개 + 선택 1개). 미체크면 다음 버튼 비활성
3. **자기소개서** (구직자만, 최대 500자). 사업자는 이 단계를 건너뜁니다

가입 완료 시 `seeker_profiles` 에 `intro` 를 insert 합니다.

### A-5 · F4 프로필 훅 (50분)
`src/hooks/useSeekerProfile.ts`:
```ts
const { profile, isLoading, save } = useSeekerProfile();   // 본인
const { profile } = useSeekerProfile(userId);              // 사업자가 지원자 볼 때
```
`save(patch)` 는 upsert. `avatar_url`·`resume_url` 은 항상 null 로 두되 필드는 유지합니다.

### A-6 · F5 사업자 훅 (1h)
`src/hooks/useEmployerApplicants.ts`:
```ts
const { applications, isLoading, setStatus } = useEmployerApplicants(jobId?);
// applications[i] = { id, status, message, createdAt, job, seeker: { nickname, profile } }
```
- jobId 없으면 내 공고 전체의 지원자
- `setStatus(id, 'viewed'|'accepted'|'rejected')` 낙관적 업데이트
- 구직자용 지원 훅도 함께: `useApply()` → `apply(jobId, message)`

### A-7 · F7 제안 훅 (1h, 컷 후보)
`src/hooks/useSeekerDeck.ts` — 사업자가 볼 구직자 덱. `seeker_profiles` 에서 아직 스와이프 안 한 사람.
`offer(seekerId, direction)` 는 `offers` upsert.

---

## 🅱️ 개발자 B — 화면 · 인터랙션

소유 경로 그대로: `src/components/` · `src/styles/` · `src/router.tsx` · `src/features/{deck,wishlist,apply}/` · `src/pages/{HomeDeck,Wishlist,Apply}Page.tsx`

**새로 소유할 것**: `src/features/onboarding/` (튜토리얼), `src/features/profile/` (프로필 화면), `src/features/employer-ui/` (사업자 화면 UI)

### B-1 · F1 홈 카드 탭 → 상세 (30분) — 지금 시작
**A를 전혀 기다리지 않습니다.** 재사용할 것이 이미 다 있습니다.
- `SwipeCard` 는 이미 탭과 드래그를 구분합니다(이동 8px 미만이면 탭)
- `ExpandedCard` + `BackFace` 를 그대로 씁니다 — 찜 화면과 같은 컴포넌트
- 덱 카드에도 `layoutId={gridCardLayoutId(job.id)}` 를 주면 확대 전환이 그대로 붙습니다

주의: 탭으로 열었을 때 **카드가 스와이프되면 안 됩니다.** 확대 중에는 덱의 키보드 단축키도 막으세요(`ExpandedCard` 가 Escape 를 capture 로 먹는 것과 같은 방식).

### B-2 · F2 역할별 라우터 분기 (40분)
`types.ts` 에 `role` 이 들어오면 시작합니다. 그 전에는 B-1·B-4 를 하세요.

```
role === 'seeker'    탭 3개: 홈(덱) / 찜 / 내정보
role === 'employer'  탭 3개: 지원자 / 내공고 / 내정보
```
- `RequireRole` 가드 추가 — 사업자가 `/wishlist` 로 오면 `/employer/applicants` 로 보냄
- `BottomTabBar` 를 role 에 따라 다른 탭 배열로 렌더 (컴포넌트는 하나, 데이터만 분기)

### B-3 · F3 가입 단계 UI 지원 (20분)
A가 `SignupPage` 안에서 단계를 관리합니다. B는 **공용 부품만** 제공하면 됩니다:
- `StepProgress` (1/3, 2/3, 3/3 진행 바)
- `Checkbox` 프리미티브 (동의 체크용) — 현재 없습니다

`src/components/ui/` 에 추가하고 배럴 export 후 **즉시 A에게 알리세요.**

### B-4 · F6 튜토리얼 (40분) — A 무관, 언제든 가능
`src/features/onboarding/Tutorial.tsx`
- 전체 화면 오버레이, 3~4장
- 우상단 **X** 로 건너뛰기, 하단 **다음** 버튼, 마지막 장은 **시작하기**
- 하단 중앙에 점 인디케이터
- 본 적 있는지는 `localStorage('albaswipe.tutorial.seen')` 로 판단 — **DB 안 씁니다**(A 작업 0)
- 내용: ① 오른쪽으로 넘기면 찜 ② 왼쪽은 관심 없음 ③ 찜 목록에서 4개씩 비교 ④ 카드 탭하면 상세

애니메이션은 **페이드만**. 블라인드 디자인은 스프링·오버슈트를 쓰지 않습니다.

### B-5 · F4 프로필 화면 (50분)
`src/features/profile/ProfileEditor.tsx` + `/me` 라우트
- 아바타 72px (이니셜) + **"사진 변경" 버튼은 비활성 + "준비 중"** — 자리는 만들되 동작하지 않습니다
- 자기소개(Textarea 500자) / 경력(Textarea) / 관심 직종(Chip 다중 선택, `jobs.category` 11종) / 희망 시급(NumberInput)
- 저장 → `save()` → 토스트

### B-6 · F5 사업자 화면 (50분)
`src/pages/EmployerApplicantsPage.tsx` + `src/features/employer-ui/ApplicantCard.tsx`
- 지원자 리스트(헤어라인 구분, 카드 아님 — 블라인드는 밀도 우선)
- 각 행: 아바타 40px + 닉네임 + 지원 공고명 + 상태 배지 + 지원일
- 행 탭 → 지원자 프로필 상세(`ExpandedCard` 와 같은 확대 패턴 재사용)
- 상세에 **채용/거절** 버튼 → `setStatus()`
- 카드가 1초 이상 보이면 자동으로 `viewed` 처리 (IntersectionObserver)

### B-7 · F7 구직자 덱 (1h, 컷 후보)
`CardStack` 을 **그대로 재사용**합니다. `job` 대신 `seeker` 를 받는 제네릭으로 바꾸지 말고, `SeekerCard` 를 따로 만들어 같은 스택에 넣으세요. 리팩터링은 지금 할 일이 아닙니다.

---

## 병렬 진행 순서 (충돌 없는 타임라인)

| 시각 | A | B | 동기화 |
|---|---|---|---|
| 13:45 | F0 시드 + DB 변경 | **F1 카드 탭 상세** | |
| 14:10 | **F2 role → `types.ts` 푸시** 🔔 | F1 계속 | **A가 푸시하면 B는 즉시 pull** |
| 14:30 | F3 가입 3단계 | F6 튜토리얼 | |
| 15:00 | F3 계속 | **B-3 Checkbox·StepProgress 푸시** 🔔 | **B가 푸시하면 A는 즉시 pull** |
| 15:20 | F4 프로필 훅 | F2 라우터 역할 분기 | |
| 16:00 | F5 사업자 훅 | F4 프로필 화면 | **중간 통합 — 배포 확인** |
| 16:30 | F5 계속 | F5 사업자 화면 | **F7 판단: 여기서 안 끝났으면 버린다** |
| 17:00 | 통합 지원 | 통합 + 빈 상태·로딩 | |
| **17:30** | **기능 동결** | **기능 동결** | **버그 수정·리허설만** |

🔔 = 상대가 막혀 있으니 푸시 직후 반드시 알립니다.

---

## 새 파일 소유권 (충돌 방지)

| 경로 | 소유 |
|---|---|
| `supabase/schema_phase2.sql` | A |
| `src/hooks/useSeekerProfile.ts` · `useEmployerApplicants.ts` · `useApply.ts` · `useSeekerDeck.ts` | A |
| `src/features/employer/` (데이터) | A |
| `src/pages/EmployerApplicantsPage.tsx` | **B** (A는 훅만 제공) |
| `src/features/onboarding/` · `src/features/profile/` · `src/features/employer-ui/` | B |
| `src/components/ui/Checkbox.tsx` · `StepProgress.tsx` | B |
| `src/router.tsx` · `BottomTabBar.tsx` | B |
| **`src/types.ts`** | **공동 — 단독 커밋 + 즉시 공지, `contract:` 접두사** |

브랜치는 지금과 동일: `a/<모듈>` · `b/<모듈>` → 빌드 통과하면 `main` 머지.

---

## 데모 시나리오 (이게 되면 성공)

1. 사업자로 가입 → 동의 체크 → 튜토리얼 건너뛰기 → **사업자 탭이 보인다**
2. 구직자로 가입(다른 브라우저) → 동의 → 자기소개서 작성 → 튜토리얼 → **구직자 탭이 보인다**
3. 구직자: 카드 **탭해서 상세 확인** → 뒤로 → 오른쪽 스와이프로 찜
4. 구직자: 찜 목록 2×2 비교 → 카드 확대 → **지원하기**
5. 사업자: 지원자 탭 → **방금 그 지원자가 보임** → 탭 → **프로필(자기소개·경력·관심) 확인** → 채용
6. 구직자: 지원 상태가 **채용 확정**으로 바뀐 것 확인

**1~6이 되면 F7 없이도 완결된 데모입니다.** F7은 있으면 좋은 보너스입니다.

---

## 하지 않기로 한 것 (명시)

- 사진·이력서 **파일 업로드** — Storage + RLS + 리사이즈로 1.5인시, 데모 그림은 이니셜 아바타로 동일
- 사업자의 **공고 작성 화면** — 시드 25건으로 데모합니다. 공고 CRUD는 그 자체로 2인시
- 채팅 / 알림 / 결제 / 지도
- 자동화 테스트
- A의 중복 프리미티브 통일 (`features/auth/form-primitives.tsx`) — 보기에 문제없다고 확인됨
