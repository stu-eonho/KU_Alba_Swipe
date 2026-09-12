# Phase 5 — 실기기 점검 피드백 반영

작성 16:35 · **기능 동결 17:30 (55분)** · 발표 18:30

---

## 0. 산수

요청 9건 ≈ **6인시**. 남은 용량 2명 × 55분 ≈ **1.8인시**.

동결을 **17:45까지 15분 미루면** 2.3인시. 그래도 Tier 2까지가 한계입니다.
**Tier 0(버그)은 무조건, Tier 1은 거의 확실, Tier 2는 A가 빠르면, Tier 3는 안 됩니다.**

| # | 항목 | 담당 | 시간 | Tier |
|---|---|---|---|---|
| P1 | **뒤로가기 3건** — 온 곳으로 돌아가기 | B | 15분 | 🔴 **0 즉시** |
| P2 | 자기소개 500 → 1000자 | A | 5분 | 🔴 **0 즉시** |
| P3 | **when2meet 드래그 시간표** | B | 50분 | 🟢 1 |
| P4 | **매칭 기능 완성** (알림 → 연락처) | A 10분 + B 20분 | 30분 | 🟢 1 |
| P5 | 사장님 공고 작성 | A | 50분 | 🟡 2 |
| P6 | 공고에 "원하는 성격" | A 20분 + B 10분 | 30분 | 🟡 2 |
| P7 | 인터랙티브 튜토리얼 | B | 60분+ | ⚫ 3 **안 함** |

**P7을 자른 이유**: 반투명 배경 + 실제 조작 유도(코치마크)는 각 화면의 실제 DOM 위치를 추적해야 합니다. 스와이프 덱은 카드가 계속 바뀌어 앵커가 흔들립니다. 60분으로 안 끝나고, 깨지면 **첫 진입 화면이 망가져** 데모 전체가 위험해집니다. 지금 있는 4장 튜토리얼도 역할을 합니다.

---

## 1. 🔴 P1 · 뒤로가기 — 버그 3건이 한 뿌리 (B, 15분)

### 원인

`src/router.tsx`의 `SettingsFullscreenLayout`이 뒤로가기를 **고정 경로**로 구현했습니다.

```tsx
function SettingsFullscreenLayout({ backTo }: { backTo: string }) {
  ...
  <IconButton onClick={() => navigate(backTo)}>   // ← 어디서 왔든 여기로 간다
```

그래서 보고된 3건이 전부 설명됩니다:

| 증상 | 원인 |
|---|---|
| 알림 → 지원 상세 → 뒤로 → **지원 현황** | `/settings/applications/:id` 의 `backTo="/settings/applications"` |
| 홈/찜 → 알림 → 뒤로 → **항상 설정** | 구직자 `NotificationsLayout` 의 `backTo="/settings"` |
| 사장님 어디서든 알림 → 뒤로 → **항상 지원자** | 사장님 `backTo="/employer/applicants"` |

### 수정

**"온 곳으로 돌아간다"가 기본, 고정 경로는 폴백**으로 씁니다.

```tsx
import { useLocation, useNavigate } from 'react-router-dom';

function SettingsFullscreenLayout({ backTo }: { backTo: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  // 앱 안에서 이동해 온 경우에만 히스토리가 쌓인다. 링크를 직접 열거나
  // 새로고침했으면 location.key === 'default' 라 -1 이 앱 밖으로 나가버린다.
  const canGoBack = location.key !== 'default';

  ...
  <IconButton
    label="뒤로 가기"
    onClick={() => (canGoBack ? navigate(-1) : navigate(backTo, { replace: true }))}
  >
```

`FullscreenLayout`(지원하기 화면)도 이미 `navigate(-1)`인데 **같은 폴백이 없습니다.** 링크를 직접 열면 앱 밖으로 나갑니다. 같이 고치세요.

**공통 훅으로 뽑으세요** — 세 곳이 같은 로직을 씁니다:
```ts
// src/components/layout/useSmartBack.ts
export function useSmartBack(fallback: string): () => void;
```

### 검증
1. 홈 → 알림 → 뒤로 → **홈** ✓
2. 찜 → 알림 → 뒤로 → **찜** ✓
3. 알림 → 지원 상세 → 뒤로 → **알림** ✓
4. 지원 현황 → 지원 상세 → 뒤로 → **지원 현황** ✓
5. 브라우저에서 `/notifications` 직접 열고 뒤로 → **설정**(폴백, 앱 밖으로 안 나감) ✓

---

## 2. 🔴 P2 · 자기소개 1000자 (A, 5분)

`intro` 최대 길이를 500 → **1000**. 고칠 곳:
- `SignupPage` 자기소개 단계의 `maxLength`와 글자수 카운터
- `ProfileEditor`의 같은 곳
- 검증 함수(`validation.ts`)에 길이 제한이 있으면 거기도

DB는 `text`라 스키마 변경이 필요 없습니다.

---

## 3. 🟢 P3 · when2meet 드래그 시간표 (B, 50분)

첨부 이미지처럼 **요일 × 시간 격자를 드래그해서 칠하는** UI입니다. 지금은 이 기능이 화면으로 존재하지 않아 "가능한 시간을 등록하면…" 안내만 뜨고 등록할 방법이 없습니다.

`src/features/availability/AvailabilityGrid.tsx` (신규, B 소유)

### 사양

- **가로 7칸**(월~일), **세로 시간 슬롯**. 범위 **09:00 ~ 23:00**, **30분 단위** (28행)
  - 새벽 공고(`00:00 ~ 06:00`)가 시드에 2건 있지만, 격자를 24시간으로 하면 모바일에서 한 화면에 안 들어옵니다. 09~23시로 자르고 안내 문구로 보완합니다
- 셀 크기: 폭은 `flex-1`(7등분), 높이 **20px**. 480px 컨테이너에서 28행 × 20px = 560px → 세로 스크롤
- 헤더: 요일 2글자(월·화…), sticky top. 좌측 시간 라벨 열 **40px 고정**, 2시간마다만 표기(09:00, 11:00…)
- **색**: 미선택 `bg-surface` + `border-line-soft` / 선택 `bg-brand`(첨부 이미지의 초록 대신 **브랜드 레드**를 씁니다 — 초록은 팔레트에 없고 "레드 하나" 원칙이 있습니다). 진하기 단계는 두지 않습니다(첨부는 여러 명 겹침 표시용이고 우리는 1인용)

### 드래그

```
pointerdown  → 시작 셀 기록. 그 셀의 현재 상태를 뒤집어 "칠하기/지우기" 모드 결정
pointermove  → 시작 셀 ~ 현재 셀의 사각 범위를 모드대로 채움
pointerup    → 확정
```

- **`setPointerCapture`를 쓰세요.** 손가락이 격자 밖으로 나가도 드래그가 끊기지 않습니다
- 격자에 **`touch-action: none`** — 없으면 드래그할 때 페이지가 같이 스크롤됩니다 (덱에서 겪은 것과 같은 함정)
- 탭(이동 없음)은 셀 하나 토글

### 프리셋 (모바일에서 드래그가 어려운 사람용)

격자 위에 칩 행: `오전(09-13)` `오후(13-18)` `저녁(18-23)` `전체 해제`
누르면 **선택된 요일 전체**에 적용. 요일 헤더를 탭하면 그 요일 전체 토글.

### 저장

A의 `useAvailability().save(list)`를 씁니다. 시그니처를 `src/hooks/useAvailability.ts`에서 확인하세요.
격자 셀 → `{ day, startMin, endMin }` 변환 시 **연속된 슬롯을 하나로 합칩니다**. 09:00~12:00을 6개 행이 아니라 `{start:540, end:720}` 한 줄로.

저장 후 토스트 "가능한 시간을 저장했어요" + 홈으로.

### 어디에 붙이나

- `/settings/availability` 라우트 신설 → 설정 화면에 "가능한 시간" 메뉴 항목
- 홈의 안내 줄 "설정하기" 링크를 `/settings` → **`/settings/availability`** 로 변경
- 가입 흐름에 넣지 마세요 — 가입이 이미 4단계라 더 길어지면 이탈합니다

---

## 4. 🟢 P4 · 매칭 기능 완성 (A 10분 + B 20분)

"매칭됐어요!" 알림은 뜨는데 **누르면 아무 일도 없습니다.** trigger와 `matched_contact()` RPC는 A가 이미 만들어 뒀으니 연결만 하면 됩니다.

### A (10분)
`src/hooks/useMatchedContact.ts`
```ts
const { email, isLoading } = useMatchedContact(counterpartId);
// supabase.rpc('matched_contact', { counterpart: counterpartId })
// 매칭이 성립하지 않았으면 null 을 돌려준다 (RPC 가 그렇게 만들어져 있음)
```
알림의 `payload.counterpartId`에 상대 id가 들어 있습니다.

### B (20분)
알림 목록에서 `type === 'mutual_match'`인 항목을 탭하면 시트(`Sheet`가 없으면 `ConfirmDialog` 형태로):

```
🎉 매칭됐어요!
메가커피 안암역점 과 서로 관심이 있어요.

이메일   owner@example.com          [복사]
                    [ 메일 보내기 ]
```

- "메일 보내기"는 `mailto:` 링크. 제목을 미리 채우세요: `[AlbaSwipe] 메가커피 안암역점 아르바이트 문의`
- 이메일이 `null`이면(매칭 해제 등) "상대 정보를 불러올 수 없어요"
- 알림 아이콘: `mutual_match`는 `Sparkles`, `employer_interested`는 `Heart`. 둘 다 `text-brand`

**이게 채팅 대신입니다.** 발표 때 "채팅은 다음 단계, 지금은 연락처를 교환합니다"라고 말하면 됩니다.

---

## 5. 🟡 P5 · 사장님 공고 작성 (A, 50분)

현재 `/employer/jobs`가 `EmployerJobsPlaceholder`입니다. 실제 기능이 없습니다.

### 스키마 (A)
```sql
-- jobs 에 INSERT 를 연다. employer_id 는 default auth.uid() 라 클라이언트가 보내지 않는다.
create policy "employer creates jobs" on jobs for insert
  with check (auth.uid() = employer_id);
create policy "employer updates own jobs" on jobs for update
  using (auth.uid() = employer_id);
grant insert, update on jobs to authenticated;
```

### 화면 (A — 폼이라 A가 빠릅니다)
`src/pages/EmployerJobFormPage.tsx` + `src/hooks/useCreateJob.ts`

필수: 상호명 · 업종(11종) · 시급 · 한 줄 요약 · 상세 · 주소 · 근무 요일 · 근무 시간
선택: 복리후생(칩 다중) · **원하는 성격**(P6)

- 근무 요일은 **`월·수·금` 형식 문자열**로 저장해야 합니다. 시간 겹침 판정이 이 포맷을 파싱합니다
- 근무 시간도 **`13:00 ~ 18:00`** 형식 (공백 포함 ` ~ `)
- **포맷이 틀리면 시간 필터가 조용히 실패합니다.** 요일 토글과 time input에서 조립하되 저장 직전에 형식을 검증하세요

`/employer/jobs`를 목록으로 바꾸고 "+ 공고 작성" 버튼 → 이 폼.

---

## 6. 🟡 P6 · 공고에 "원하는 성격" (A 20분 + B 10분)

사장님이 "이런 지원자였으면 좋겠다"를 미리 밝히는 기능. 지원자가 공고를 볼 때 보입니다.

### A
```sql
alter table jobs add column if not exists wanted_traits text[] default '{}';
```
`types.ts`의 `Job`에 `wantedTraits: string[]` 추가 (**단독 커밋 + `contract:` + 공지**).
값은 **`PERSONALITY_TRAITS` 상수를 그대로 재사용**합니다(활발함·성실함·꼼꼼함 등 12종). 새 목록을 만들지 마세요 — 구직자 프로필과 같은 어휘여야 나중에 매칭 점수를 낼 수 있습니다.
공고 작성 폼(P5)에 칩 다중 선택으로 추가.

### B
- **카드 뒷면**(`BackFace`)의 "근무 조건" 아래에 `이런 분을 찾아요` 섹션 + 칩
- 여유가 있으면 **덱 카드 앞면**에도 1~2개. 단 카드가 이미 5줄이라 넘치면 넣지 마세요
- 내 프로필의 성격과 겹치는 칩은 `bg-brand-soft` + `text-brand`로 강조하면 좋지만 **선택 사항**입니다

---

## 7. 타임라인

| 시각 | A | B |
|---|---|---|
| 16:35 | **P2 자기소개 1000자**(5분) → P4-A 매칭 훅(10분) | **P1 뒤로가기 3건**(15분) |
| 16:50 | P5 공고 작성 시작 | **P3 when2meet 격자** |
| 17:20 | P5 계속 | P3 마무리 → **P4-B 매칭 시트** |
| **17:45** | **기능 동결**(15분 연장) | **기능 동결** |
| 17:45~18:15 | 통합 · 배포 확인 · 실기기 리허설 | |
| 18:15 | 스와이프 기록 초기화 · 데모 계정 정리 | |

**17:20에 P3가 안 끝났으면 P4를 버리고 P3를 끝내세요.** when2meet 격자가 없으면 "가능한 시간" 기능 전체가 화면에 없는 것이나 마찬가지입니다.

---

## 8. 소유권

| 경로 | 소유 |
|---|---|
| `src/components/layout/useSmartBack.ts` · `router.tsx` | B |
| `src/features/availability/` | B |
| `src/features/notifications/` (매칭 시트) | B |
| `src/hooks/useMatchedContact.ts` · `useCreateJob.ts` | A |
| `src/pages/EmployerJobFormPage.tsx` | A |
| `src/pages/SignupPage.tsx` · `features/profile/ProfileEditor.tsx` (1000자) | A |
| `src/features/wishlist/BackFace.tsx` (원하는 성격 표시) | B |
| `src/types.ts` | 공동 — 단독 커밋 + `contract:` + 즉시 공지 |

---

## 9. 안 하는 것

- **인터랙티브 튜토리얼**(반투명 코치마크) — 60분+, 앵커가 흔들리는 스와이프 덱에서 깨지기 쉽고, 깨지면 첫 진입 화면이 망가져 데모 전체가 위험
- 사진·이력서 업로드 (Phase 4에서 컷한 그대로)
- 실시간 채팅 — P4의 연락처 교환으로 대체
- 24시간 시간표 — 09~23시로 자름. 새벽 공고 2건은 "전체 보기"로 볼 수 있음
