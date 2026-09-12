# Phase 4 작업 분담 — 시간 매칭 · 지원자 스와이프 · 상호 관심

작성 16:00 · **기능 동결 17:30 (1시간 30분 남음)** · 발표 18:30

---

## 1. 먼저 — 산수를 맞춰야 합니다

요청 8건의 총량은 **약 12인시**입니다. 남은 개발 용량은 **2명 × 1.5시간 = 3인시**이고, 여기서 통합·리허설을 빼면 **실질 2.5인시**입니다.

**4분의 1만 들어갑니다.** 전부 시작하면 전부 미완성으로 끝납니다.

그래서 이 문서는 **Tier 1만 하고, Tier 2는 시간이 남으면, Tier 3는 안 합니다.** 아래 배분은 "B가 더 오래 걸리고 A가 남는다"는 관찰을 반영해 **A 쪽으로 크게 옮긴** 결과입니다.

### 컷 결정

| 요청 | 판정 | 이유 |
|---|---|---|
| 시간 겹침 자동 판정 | 🟢 **Tier 1** | 사용자가 "제일 세다"고 한 기능. `work_days`/`work_hours` 포맷이 완전히 통일돼 있어 파싱이 싸다 |
| 지원자 스와이프 + 보류칸 | 🟢 **Tier 1** | `offers` 테이블이 **이미 있다**. `CardStack` 재사용 |
| "관심 있다" 알림 + 상호 매칭 알림 | 🟡 **Tier 2** | 알림 인프라(테이블+trigger)가 이미 있어 타입만 늘리면 된다 |
| 사장님 공고 직접 작성 | 🟡 **Tier 2** | 폼 하나. A가 가입 3단계를 만든 경험 그대로 |
| 지원자 카드에 사진 작게·자기소개 크게 | 🟢 **Tier 1에 포함** | 레이아웃 조정 15분 |
| **홈 카드 별점 + 정보 채우기** | 🟢 **Tier 1** | `rating`·`benefits`·`address` 가 이미 DB 에 있다. 표시만 하면 됨 |
| 사장님이 구직자 평점 매기기 | 🟡 **Tier 2** | 테이블 1개 + 별 입력 UI. 30분 |
| **사진 업로드** | 🔴 **안 함** | Storage 버킷 + RLS + presigned + 리사이즈 = 1.5인시. 남은 시간의 60%를 먹는다 |
| **채팅** | 🔴 **안 함** | 실시간 채팅은 최소 2인시. 아래 대안 참조 |

### 채팅 대신 — 상호 관심 시 연락처 공개

원하는 그림은 "둘 다 관심 있으면 연결된다"입니다. 채팅을 만들지 않고도 그 이야기는 완성됩니다:

> 양쪽이 서로 오른쪽으로 넘기면 → **양쪽 모두에게 매칭 알림** → 알림을 열면 **상대 이메일이 공개**되고 "연락하기" 버튼(mailto)

**10분이면 되고, 데모에서 하는 말은 똑같습니다.** 채팅은 발표 때 "다음 단계"로 말하세요.

---

## 2. 왜 A 쪽으로 옮겼나

지금까지 B가 화면을 전부 들고 있어 병목이었습니다. Phase 4에서는 **A가 UI까지 일부 가져갑니다.**

- **가입 시 가능 시간 입력** → A. `SignupPage`가 원래 A 소유고, 3단계 위저드를 A가 이미 만들었습니다. 여기에 4단계를 붙이는 게 B가 새 화면을 만드는 것보다 훨씬 빠릅니다
- **공고 작성 폼** → A. 폼 검증(`validation.ts`)과 폼 프리미티브를 A가 갖고 있습니다
- **시간 겹침 판정 로직 전부** → A. 순수 함수라 UI가 없습니다

**B는 제스처·애니메이션이 필요한 것만** 맡습니다. 그게 B가 느린 이유이자 B만 할 수 있는 일입니다.

| | A | B |
|---|---|---|
| Tier 1 | 1시간 10분 | 1시간 10분 |
| Tier 2 | 50분 | 15분 |

---

## 3. DB 변경 — A, 지금 바로 (10분)

`supabase/schema_phase4.sql`로 저장하고 SQL Editor에서 **한 번에** 실행합니다.

```sql
-- ============================================================
-- 1. 가능 시간 (F14)
-- ============================================================
-- 분 단위 정수로 저장한다. "13:00" 같은 문자열로 두면 비교할 때마다 파싱해야 하고
-- 자정 넘김 처리가 지저분해진다. 780 = 13*60.
create table if not exists user_availability (
  user_id   uuid not null references auth.users(id) on delete cascade default auth.uid(),
  day       text not null check (day in ('월','화','수','목','금','토','일')),
  start_min integer not null check (start_min between 0 and 1440),
  end_min   integer not null check (end_min   between 0 and 1440),
  primary key (user_id, day)
);

alter table user_availability enable row level security;
create policy "own availability" on user_availability for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on user_availability to authenticated;

-- ============================================================
-- 2. 알림 타입 추가 (F16)
-- ============================================================
-- 기존 check 제약을 갈아끼운다. 컬럼 삭제가 아니라 안전하다.
alter table notifications drop constraint if exists notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (type in (
    'application_received','application_viewed','application_accepted',
    'application_rejected','system',
    'employer_interested',   -- 사장님이 관심 표시 → 구직자에게
    'mutual_match'           -- 양쪽 다 관심 → 양쪽에게
  ));

-- ============================================================
-- 3. 상호 매칭 감지 trigger (F16)
-- ============================================================
-- offers 에 right 가 들어올 때, 그 구직자가 이 사장님 공고에 이미 지원했으면
-- (= 구직자가 먼저 관심을 표시한 것) 양쪽에 매칭 알림을 만든다.
create or replace function public.on_offer_right()
returns trigger language plpgsql security definer as $$
declare
  v_applied boolean;
  v_seeker_name text;
  v_store text;
begin
  if new.direction <> 'right' then return new; end if;

  select exists (
    select 1 from applications a
    join jobs j on j.id = a.job_id
    where a.user_id = new.seeker_id and j.employer_id = new.employer_id
  ) into v_applied;

  select coalesce(nickname, '지원자') into v_seeker_name
  from seeker_profiles where user_id = new.seeker_id;

  select store_name into v_store from jobs where id = new.job_id;

  if v_applied then
    -- 양쪽 다 관심 → 매칭
    insert into notifications (user_id, type, title, body, payload)
    values
      (new.seeker_id, 'mutual_match', '매칭됐어요!',
       coalesce(v_store,'사장님') || ' 에서도 회원님께 관심이 있어요. 연락해 보세요.',
       jsonb_build_object('counterpartId', new.employer_id)),
      (new.employer_id, 'mutual_match', '매칭됐어요!',
       v_seeker_name || ' 님도 관심이 있어요. 연락해 보세요.',
       jsonb_build_object('counterpartId', new.seeker_id));
  else
    -- 사장님만 관심
    insert into notifications (user_id, type, title, body, payload)
    values (new.seeker_id, 'employer_interested', '관심을 받았어요',
            coalesce(v_store,'한 사장님') || ' 에서 회원님 프로필을 관심 있게 봤어요.',
            jsonb_build_object('counterpartId', new.employer_id));
  end if;

  return new;
end $$;

drop trigger if exists offers_right_notify on offers;
create trigger offers_right_notify after insert or update on offers
  for each row execute function public.on_offer_right();

-- ============================================================
-- 4. 매칭 상대 이메일 조회 (채팅 대신 — F16)
-- ============================================================
-- auth.users 는 REST 로 노출되지 않는다. 매칭된 상대의 이메일만 꺼내는 함수를 연다.
create or replace function public.matched_contact(counterpart uuid)
returns text language plpgsql security definer as $$
declare v_email text;
begin
  -- 호출자와 상대 사이에 실제 매칭이 있을 때만 공개한다
  if not exists (
    select 1 from offers o
    where o.direction = 'right'
      and ((o.employer_id = auth.uid() and o.seeker_id = counterpart)
        or (o.seeker_id  = auth.uid() and o.employer_id = counterpart))
  ) then
    return null;
  end if;
  select email into v_email from auth.users where id = counterpart;
  return v_email;
end $$;

grant execute on function public.matched_contact(uuid) to authenticated;
```

> ⚠️ **`fix_employer_owner.sql`을 먼저 실행했는지 확인하세요.** 공고에 주인이 없으면 지원자 스와이프도 매칭도 전부 빈 화면입니다.

---

## 4. 🅰️ 개발자 A

### A-1 · DB 변경 실행 (10분) — 지금
위 3절 그대로. 그 전에 `fix_employer_owner.sql` 확인.

### A-2 · 시간 겹침 판정 (40분) — **Tier 1, 이게 핵심**

`src/lib/availability.ts` (순수 함수, 테스트 없이도 콘솔로 확인 가능)

포맷이 완전히 통일돼 있습니다:
```
work_days  : "월·수·금"      → split('·')
work_hours : "13:00 ~ 18:00" → split(' ~ ') → 각각 "HH:MM"
```

```ts
export function toMinutes(hhmm: string): number;          // "13:00" → 780
export function parseWorkDays(s: string): string[];        // "월·수·금" → ['월','수','금']
export function parseWorkHours(s: string): { start: number; end: number };
// "00:00 ~ 06:00" 처럼 start < end 면 당일. start > end 면 익일로 간주해 end += 1440.

/**
 * 공고의 **모든 근무 요일**에서 사용자가 가능해야 통과.
 * 하나라도 안 맞으면 false → 덱에서 제외.
 * 가능 시간을 아예 등록하지 않은 사용자는 전부 통과시킨다(기존 계정 보호).
 */
export function isCompatible(job: Job, availability: Availability[]): boolean;
```

`src/hooks/useAvailability.ts` — `{ availability, isLoading, save(list) }`

**`useDeck`에 필터를 겁니다.** 서버에서 거르지 말고 **클라이언트에서** 거르세요 — 25건뿐이고, SQL로 문자열 파싱하는 것보다 훨씬 빠르게 만들 수 있습니다.

```ts
// useDeck 안
const compatible = jobs.filter((j) => isCompatible(j, availability));
```

**제외된 개수를 함께 반환하세요.** B가 "내 시간과 겹쳐서 3건을 숨겼어요"를 보여줍니다 — 데모에서 이 한 줄이 앱 성격을 바꿉니다.

### A-3 · 가입 4단계: 가능 시간 입력 (30분) — **Tier 1, A가 UI까지**

`SignupPage`(A 소유)의 3단계 위저드에 **4단계**를 붙입니다. 구직자만.

- 요일 7개 토글(이미 있는 `Chip` 재사용) → 선택한 요일마다 시작/종료 시간
- 빠른 입력: "오전(09-13)" "오후(13-18)" "저녁(18-22)" "종일(09-22)" 프리셋 버튼
- **건너뛰기 허용.** 등록 안 하면 필터가 동작하지 않고 전부 보입니다
- 저장은 `user_availability` upsert

설정 화면에서도 고칠 수 있으면 좋지만 **Tier 2**입니다. 가입 때만 받아도 데모는 됩니다.

### A-4 · 지원자 덱 훅 (20분) — **Tier 1**

`src/hooks/useApplicantDeck.ts` — `offers` 테이블이 이미 있어 새 스키마가 필요 없습니다.

```ts
const { applicants, isLoading, offer } = useApplicantDeck();
// applicants: 내 공고에 지원했고 아직 offers 에 없는 사람들 (ApplicantEntry[])
// offer(seekerId, 'right' | 'left', jobId)  ← upsert. trigger 가 알림을 만든다
```

`src/hooks/useHeldApplicants.ts` — `direction='left'`인 사람들(보류칸용). `offer(id,'right')`로 되살릴 수 있어야 합니다.

### A-5 · 공고 작성 (50분) — **Tier 2**

`src/pages/EmployerJobFormPage.tsx` + `src/hooks/useCreateJob.ts`
필드: 상호명 · 업종(11종 Select) · 시급 · 한 줄 요약 · 상세 · 주소 · 근무요일 · 근무시간 · 복리후생
`employer_id`는 `default auth.uid()`로 자동. `jobs`에 INSERT 정책을 추가해야 합니다:
```sql
create policy "employer creates jobs" on jobs for insert
  with check (auth.uid() = employer_id);
grant insert, update on jobs to authenticated;
```
현재 `EmployerJobsPlaceholder.tsx`를 이 화면으로 교체합니다.

### A-6 · 사장님 → 구직자 평점 (30분) — **Tier 2**

양방향 평가 구조를 완성합니다. 공고에 평점이 있듯 지원자에게도 평점이 붙습니다.

```sql
create table if not exists seeker_ratings (
  employer_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  seeker_id   uuid not null references auth.users(id) on delete cascade,
  score       integer not null check (score between 1 and 5),
  comment     text,
  created_at  timestamptz default now(),
  primary key (employer_id, seeker_id)   -- 사장님 1명당 지원자 1명에 1회
);
alter table seeker_ratings enable row level security;

-- 쓰기: 내 공고에 지원한 사람에게만
create policy "employer rates applicant" on seeker_ratings for all
  using (auth.uid() = employer_id)
  with check (
    auth.uid() = employer_id and exists (
      select 1 from applications a join jobs j on j.id = a.job_id
      where a.user_id = seeker_ratings.seeker_id and j.employer_id = auth.uid()
    )
  );
-- 읽기: 사장님들은 지원자 평점을 본다(평판이 목적이므로 공개)
create policy "authenticated read ratings" on seeker_ratings for select using (auth.uid() is not null);
grant select, insert, update on seeker_ratings to authenticated;
```

`src/hooks/useSeekerRating.ts`
```ts
const { avg, count, myScore, rate } = useSeekerRating(seekerId);
// rate(score, comment?) → upsert
```

> **주의**: 데모에서 평점을 매길 맥락이 약합니다(보통 근무가 끝나야 평가함). 발표 때는 "채용 후 상호 평가"로 설명하세요. 그래서 Tier 2입니다 — Tier 1이 다 끝났을 때만 하세요.


---

## 5. 🅱️ 개발자 B

### B-1 · 지원자 스와이프 덱 (50분) — **Tier 1**

`src/features/employer-deck/` (신규)

**`CardStack`을 그대로 재사용합니다.** 제네릭으로 리팩터링하지 마세요 — 지금 할 일이 아닙니다. `ApplicantCard`를 만들어 같은 스택에 넣습니다.

- 오른쪽 = **관심 있음**(연락 달라) → `offer(id,'right')` → trigger가 알림 발송
- 왼쪽 = **보류** → `offer(id,'left')` → 사라지지 않고 **보류 탭으로 이동**
- 컨트롤 버튼 2개 라벨: "보류" / "관심 있어요"

**카드 레이아웃 (요청 반영)**
- 사진(이니셜 아바타) **56px로 작게**, 좌상단
- **자기소개를 가장 크게** — 16px, 최대 4줄
- 그 아래: 경력 · 관심 직종 Chip · MBTI · 성격 키워드
- 맨 아래: 지원한 공고명 + 지원일 (12px `text-faint`)

### B-2 · 보류 탭 (20분) — **Tier 1**

사업자 탭에 "보류" 추가. 리스트(헤어라인 구분, 카드 아님) + 각 행에 "다시 보기" 버튼 → `offer(id,'right')`.

**바로 없애지 않는다는 게 요청의 핵심입니다.** 되돌릴 수 있어야 합니다.

### B-3 · 시간 필터 안내 (10분) — **Tier 1**

덱 상단에 A가 준 제외 개수를 표시:
> `내 가능 시간과 겹치지 않는 공고 3건을 숨겼어요` · 12px `text-faint` · 우측에 "전체 보기" 텍스트 버튼(필터 해제)

**데모에서 이 줄을 손가락으로 짚으세요.** 앱이 단순 스와이프에서 매칭 서비스로 보이는 지점입니다.

### B-6 · 지원자 평점 UI (15분) — **Tier 2**

`ApplicantDetail`에 별 5개 입력(탭으로 선택) + 평균 표시. `useSeekerRating` 사용.
지원자 카드에도 평균 별점을 작게 표시 — 공고 카드와 같은 모양이라 일관됩니다.

### B-4 · 매칭 알림 UI (15분) — **Tier 2**

알림 목록은 이미 있습니다. `mutual_match` / `employer_interested` 타입에 아이콘·색만 추가하고, `mutual_match`를 열면 `matched_contact()` RPC로 이메일을 받아 **"연락하기"(mailto)** 버튼을 보여줍니다.

### B-5 · 홈 카드 정보 채우기 + 별점 (25분) — **Tier 1, 가성비 최고**

카드가 비어 보인다는 지적이 맞습니다. **`SwipeCard`가 `Job`의 7개 필드만 쓰고 있습니다.**
DB에 값이 다 들어 있는데 안 쓰는 것: **`rating` · `reviewCount` · `benefits` · `address`**.
새 쿼리도, 새 스키마도 필요 없습니다. **표시만 하면 됩니다.**

```
현재 쓰는 것 : storeName · category · hourlyWage · summary · workDays · workHours · imageUrl
안 쓰는 것   : rating(4.3) · reviewCount(3) · benefits(["음료제공","주휴수당"]) · address
```

**카드 하단 재구성** (위에서부터)

| 줄 | 내용 | 스타일 |
|---|---|---|
| 1 | 시급 **+ 그 옆에 별점** | 시급 18px/600 `text-ink` · 별 `Star` 14px `text-star` + `4.3` 14px/600 + `(3)` 12px `text-faint` |
| 2 | 근무 요일 · 시간 | 14px `text-body` |
| 3 | **지역** (주소에서 "성북구"만) | `MapPin` 12px + 12px `text-faint` |
| 4 | 한 줄 요약 | 14px `text-body`, 2줄 말줄임 |
| 5 | **복리후생 칩 최대 3개 + "+N"** | `Chip` 22px, `bg-subtle` `text-muted` 11px |

- 지역 추출: `address.split(' ')[1]` (예: `"서울 성북구 안암로 145"` → `"성북구"`). 시드 포맷이 통일돼 있어 이걸로 충분합니다
- **`rating === 0`이면 별점 줄을 통째로 숨깁니다.** "0.0 (0)"은 나쁜 가게처럼 보입니다
- 별점은 `text-star`(`#ff4848`, Upvote Red) — Blind의 좋아요/카운트 색이라 원칙에 맞습니다

같은 정보를 **찜 격자 카드**에도 넣으세요. 단 격자는 4개 정보 제한이 있으니 **별점만** 추가합니다(시급 옆).


---

## 6. 타임라인

| 시각 | A | B |
|---|---|---|
| 16:00 | **DB 변경 실행** + `fix_employer_owner` 확인 | B-1 지원자 카드 레이아웃 |
| 16:15 | A-2 시간 겹침 판정 (순수함수 + 훅) | B-1 계속 (CardStack 재사용) |
| 16:45 | **A-2 푸시** 🔔 · A-4 지원자 덱 훅 | B-2 보류 탭 |
| 17:05 | A-3 가입 4단계 | **B-5 카드 별점·정보** + B-3 필터 안내 |
| **17:30** | **기능 동결** | **기능 동결** |
| 17:30~18:00 | 통합 · 배포 확인 · 리허설 | |
| 18:00 | 스와이프 기록 초기화 · 데모 계정 정리 | |

**Tier 2(공고 작성 · 매칭 알림 UI)는 위가 다 끝났을 때만.** 17:00에 Tier 1이 안 끝났으면 Tier 2는 버립니다.

---

## 7. 새 파일 소유권

| 경로 | 소유 |
|---|---|
| `supabase/schema_phase4.sql` | A |
| `src/lib/availability.ts` | A |
| `src/hooks/useAvailability.ts` · `useApplicantDeck.ts` · `useHeldApplicants.ts` · `useCreateJob.ts` | A |
| `src/pages/EmployerJobFormPage.tsx` | A |
| `src/features/employer-deck/` | **B** |
| `src/features/employer-ui/ApplicantCard.tsx` (레이아웃 수정) | **B** |
| `src/features/deck/SwipeCard.tsx` · `wishlist/GridCard.tsx` (별점·정보 추가) | **B** |
| `src/hooks/useSeekerRating.ts` (Tier 2) | A |
| `src/router.tsx` · `BottomTabBar.tsx` (보류 탭 추가) | **B** |
| `src/types.ts` | 공동 — 단독 커밋 + `contract:` + 즉시 공지 |

`types.ts`에 추가될 것: `Availability` · `OfferDirection` · `NotificationType`에 두 값 추가.
**A가 먼저 푸시하고 알리세요.** B가 B-1에서 바로 씁니다.

---

## 8. 데모 시나리오 (Tier 1까지만 해도 완결)

1. 구직자 가입 → **가능 시간 입력**(월·수·금 13-18)
2. 홈: **"겹치지 않는 공고 3건을 숨겼어요"** ← 손가락으로 짚을 지점
   카드에 **시급 옆 별점 4.3 (3)** + 복리후생 칩 + 지역이 보인다
3. 스와이프 → 찜 → 지원
4. 사장님 로그인 → **지원자 탭에서 스와이프**
5. 한 명은 왼쪽(보류) → **보류 탭에 남아 있는 것 확인** → "다시 보기"로 복구
6. 한 명은 오른쪽(관심 있어요) → **구직자에게 알림 발송**
7. 구직자가 이미 지원했으므로 → **양쪽에 "매칭됐어요!" 알림** (Tier 2면 연락처까지)

---

## 9. 하지 않기로 한 것

- **사진 업로드** — Storage + RLS + 리사이즈 1.5인시. 남은 시간의 60%. 이니셜 아바타로 대체
- **실시간 채팅** — 최소 2인시. 상호 매칭 알림 + 이메일 공개로 이야기는 완성됨
- 사업자 프로필 · 공고 수정/삭제 · 지원자 검색/정렬
