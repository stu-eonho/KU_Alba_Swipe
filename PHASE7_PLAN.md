# Phase 7 — 추천 알고리즘 · 지역 필터 · 버그 수정

작성 17:40 · **기능 동결 20:00** · 발표 **20:50**

---

## 1. 추천 알고리즘 — KNN은 이 상황에 맞지 않습니다

질문: *"KNN 사용해서 적용하는게 좋아보이는데 어떤 알고리즘이 좋을까?"*

### KNN을 쓰면 안 되는 이유

| | 문제 |
|---|---|
| **아이템이 25~50개** | k-NN은 이웃이 충분히 밀집해야 의미가 생깁니다. 25개에서 k=5면 전체의 20%가 "이웃"이라 사실상 무작위입니다 |
| **사용자가 거의 없음** | 사용자 기반 협업 필터링(누가 나와 비슷한가)은 수백~수천 명이 있어야 합니다. 데모에는 3~4명입니다 |
| **실시간 갱신이 비쌈** | 스와이프마다 전체 거리 재계산이 필요합니다 |
| **설명이 안 됨** | 발표에서 "왜 이 공고가 떴나"를 말할 수 없습니다. 이게 제일 큽니다 |

### 대신 쓸 것 — 콘텐츠 기반 선호 벡터 (Rocchio 변형)

공고를 **특징 벡터**로 만들고, 사용자마다 **선호 가중치 벡터**를 들고 다니면서 스와이프할 때마다 갱신합니다.

```
공고 특징 f(job)  — 전부 0 또는 1, 또는 0~1 정규화
  직종      카페·음식점·편의점·판매·배달·물류·사무·과외·행사·주방·기타  (11)
  시급구간  ~11000 / 11000~12500 / 12500~14000 / 14000~          (4)
  시간대    오전 / 오후 / 저녁 / 새벽                              (4)
  요일      주중 위주 / 주말 포함                                  (2)
  복리후생  식사제공·주휴수당·4대보험·초보가능·야간수당·당일지급…    (8)
  지역      시·도 단위                                            (17)
                                                          총 46차원

스와이프 갱신
  오른쪽 → w += α · f(job)     α = 1.0
  왼쪽   → w -= β · f(job)     β = 0.4     (부정 신호를 약하게 — 왼쪽은 "싫다"보다 "지금은 아니다"에 가깝다)
  매 갱신마다 w *= 0.98        (지수 감쇠 — 최근 취향이 더 세게 반영된다)

점수
  score(job) = cosine(w, f(job))
  덱 정렬 = score 내림차순
```

**왜 이게 맞나**

- 아이템이 25개든 25만 개든 동작합니다. 밀도 가정이 없습니다
- 스와이프 한 번에 O(46). 실시간입니다
- **설명 가능합니다.** `w`에서 가장 큰 성분을 뽑아 화면에 띄울 수 있습니다:
  > `회원님은 요즘 **카페 · 오후 · 식사제공** 공고를 좋아하시네요`

  발표에서 이 한 줄을 보여주고 "카페를 세 번 넘기니 가중치가 올라갔습니다"라고 말할 수 있습니다. **심사위원에게 알고리즘이 실제로 도는 걸 증명하는 유일한 방법**입니다
- 콜드 스타트를 **초기 취향 선택**으로 해결합니다 (아래 F1)

> KNN은 사용자가 수천 명 쌓이고 "당신과 비슷한 사람들이 지원한 공고" 를 만들 때 씁니다. 그때는 협업 필터링이 맞고, 지금은 아닙니다. 발표에서 이렇게 말하면 오히려 설계를 이해하고 있다는 신호가 됩니다.

---

## 2. 산수

남은 개발 2시간 20분 × 2명 = **4.6인시**. 요청 총량 **약 9인시**.

**절반만 들어갑니다.** 버그부터 잡고, 데모에서 말이 되는 순서로 배열합니다.

| # | 항목 | 담당 | 시간 | Tier |
|---|---|---|---|---|
| **B1** | 찜 해제한 공고가 영영 안 뜨는 버그 | A 10분 | 10분 | 🔴 **0** |
| **B2** | 설정에 아바타 대신 이니셜이 뜨는 버그 | B 10분 | 10분 | 🔴 **0** |
| **F1** | **추천 알고리즘** (초기 취향 + 실시간 갱신) | A 1h + B 40분 | 1.7h | 🟢 1 |
| **F2** | **지역 필터 (전국)** | A 30분 + B 40분 | 1.2h | 🟢 1 |
| **F3** | 홈 상세보기를 단일 창으로 | B 30분 | 30분 | 🟢 1 |
| **F4** | 구직 샘플 데이터 확충 | A 20분 | 20분 | 🟢 1 |
| **F5** | 지원서 템플릿 저장/붙여넣기 | A 30분 + B 30분 | 1h | 🟡 2 |
| **F6** | 공고 이미지 첨부 | A 30분 + B 30분 | 1h | 🟡 2 |
| **F7** | 평점 UI + "이런 분을 찾아요" | B 40분 | 40분 | 🟡 2 |
| **F8** | "사업자"→"구인자" A 소유 2곳 | A 5분 | 5분 | 🟡 2 |
| **F9** | **역할별 튜토리얼** (구인자 신설 + 구직자 확장) | B 40분 | 40분 | 🟡 2 |

**Tier 0+1 = 3.9인시.** 여기까지가 현실선입니다. Tier 2는 남는 사람이 집어갑니다.

---

## 3. 🔴 버그 2건 — 지금 바로

### B1 · 찜 해제한 공고가 영영 안 뜬다 (A, 10분)

**증상**: 찜했다가 해제하면 그 공고가 덱에 다시는 안 나옵니다.

**원인**: `fetchDeckJobs`가 **스와이프 기록이 있는 공고를 전부** 제외합니다(좌·우 무관). `unwishlist`는 행을 지우지 않고 `direction`을 `'left'`로 바꿀 뿐이라 기록이 남습니다.

```ts
// src/lib/api/swipes.ts — 현재
await supabase.from('swipes').update({ direction: 'left' }).eq('job_id', jobId);
```

**이건 원래 의도한 동작이었습니다.** "해제한 공고가 덱에 다시 나오면 이상하다"는 판단이었는데, 사용자가 반대로 원합니다. 사용자 판단을 따릅니다.

**수정**: `update` → `delete`.
```ts
await supabase.from('swipes').delete().eq('job_id', jobId);
```

찜 해제 = 없던 일로 되돌리기. 그 공고는 덱 맨 뒤에 다시 나타납니다.
`WishlistPage`의 "되돌리기" 토스트는 그대로 동작합니다(`swipe(id,'right')`로 재등록).

### B2 · 설정에 아바타 대신 이니셜이 뜬다 (B, 10분)

**원인**: `SettingsPage.tsx:86`이 `{user.nickname.charAt(0)}`을 **직접 그립니다.** `ProfileAvatar`를 쓰지 않아 `avatarUrl`을 볼 방법이 없습니다.

**수정**: `useSeekerProfile()`로 프로필을 읽어 `<ProfileAvatar nickname={...} avatarUrl={profile?.avatarUrl} size={56} />`로 교체.
`ProfileAvatar`는 이미 `avatarUrl`이 있으면 이미지를, 없으면 이니셜을 그립니다.

---

## 4. 🟢 F1 · 추천 알고리즘 (A 1h + B 40분)

### A — 데이터와 점수

**스키마**
```sql
create table if not exists user_preferences (
  user_id    uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  weights    jsonb not null default '{}'::jsonb,   -- { "cat:카페": 2.3, "wage:2": 1.1, ... }
  updated_at timestamptz default now()
);
alter table user_preferences enable row level security;
create policy "own prefs" on user_preferences for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update on user_preferences to authenticated;
```

`jsonb` 희소 맵을 쓰는 이유: 46차원 배열을 컬럼으로 두면 특징을 추가할 때마다 스키마를 바꿔야 합니다. 키-값이면 특징 추가가 코드 변경만으로 끝납니다.

**`src/lib/recommend.ts`** (순수 함수 — 테스트 없이 콘솔로 확인 가능)
```ts
export function featuresOf(job: Job): Record<string, number>;
//  { 'cat:카페': 1, 'wage:2': 1, 'time:오후': 1, 'ben:식사제공': 1, 'region:서울': 1, ... }

export function updateWeights(
  w: Record<string, number>, job: Job, direction: 'left' | 'right',
): Record<string, number>;
//  right: w[k] += 1.0 * f[k]   left: w[k] -= 0.4 * f[k]   그 뒤 전체 *= 0.98

export function scoreJob(w: Record<string, number>, job: Job): number;
//  cosine(w, f). w 가 비어 있으면 0 — 정렬이 무의미해지므로 호출부가 최신순으로 폴백

export function topPreferences(w: Record<string, number>, n = 3): string[];
//  가중치 상위 n개의 사람이 읽을 수 있는 라벨. B 가 화면에 띄운다
```

**`src/hooks/usePreferences.ts`** → `{ weights, isLoading, applySwipe(job, direction), setInitial(picks) }`
- `applySwipe`는 **낙관적**으로 로컬 가중치를 먼저 올리고 서버에 비동기 저장. 스와이프 체감을 늦추면 안 됩니다
- 저장 실패는 조용히 무시(다음 스와이프에 다시 저장됨)

**`useDeck` 정렬 연결** — 기존 시간 필터를 통과한 공고를 `scoreJob` 내림차순으로 정렬. 가중치가 비어 있으면 기존 순서 유지.

### B — 화면

**초기 취향 선택** `src/features/preferences/InitialPreferences.tsx`
- 가입 직후 1회. 튜토리얼 **앞**에 넣습니다
- "어떤 일에 관심 있으세요?" — 직종 칩 11개 다중 선택(최소 1개)
- "선호하는 시간대는?" — 오전/오후/저녁/새벽 칩
- 건너뛰기 허용. 건너뛰면 가중치가 비어 최신순으로 시작합니다
- 선택 → `setInitial(picks)`가 해당 키에 초기 가중치 2.0을 넣습니다

**취향 배너** — 홈 덱 상단 (시간 필터 안내 줄 아래)
```
요즘 카페 · 오후 · 식사제공 공고를 좋아하시네요        취향 초기화
```
- `topPreferences(weights, 3)` 결과. 가중치가 비면 배너를 그리지 않습니다
- 12px `text-faint`, 우측 "취향 초기화"는 텍스트 버튼
- **발표에서 이 줄을 짚으세요.** 카페를 세 번 넘긴 뒤 다시 보면 라벨이 바뀌어 있습니다. 알고리즘이 도는 유일한 증거입니다

---

## 5. 🟢 F2 · 지역 필터 (전국) (A 30분 + B 40분)

### A
```sql
alter table jobs add column if not exists region text;
-- 기존 25건은 주소에서 채웁니다
update jobs set region = split_part(address, ' ', 1) where region is null;
```
`region`은 **시·도 단위**(서울·경기·부산…)로 둡니다. 시·군·구까지 나누면 데모 데이터가 서울 성북구에 몰려 필터가 전부 0건이 됩니다.

`types.ts`의 `Job`에 `region: string` 추가 → **단독 커밋 + `contract:` + 공지**.
`useDeck`에 `regions?: string[]` 파라미터를 받아 필터.

### B
`src/features/deck/RegionFilterSheet.tsx`
- 홈 탑바 우측에 필터 아이콘(lucide `SlidersHorizontal`) → 시트
- 전국 17개 시·도 칩 다중 선택 + "전국" 토글
- 선택은 `localStorage`에 저장(`albaswipe.regions`) — 서버 왕복 없이 즉시 반영
- 선택된 게 있으면 탑바 아이콘에 점 배지
- 시트 하단 "적용" → 덱 재정렬

**시드에 서울 외 지역이 거의 없습니다.** F4에서 지역을 흩뿌려야 이 기능이 데모에서 보입니다. 순서상 F4를 먼저 하거나 같이 하세요.

---

## 6. 🟢 F3 · 홈 상세보기를 단일 창으로 (B, 30분)

**현재**: 홈에서 카드를 탭하면 `ExpandedCard`가 확대 오버레이로 뜹니다. 사용자는 **탭(오버레이)이 아니라 하나의 창**으로 열리길 원합니다.

**수정**: 홈에서 카드 탭 → `/jobs/:jobId` 라우트로 **이동**. `FullscreenLayout`(탭바 없음, 뒤로가기만).
- 내용은 `BackFace`를 그대로 재사용 — 새로 만들지 않습니다
- 뒤로가기는 `useSmartBack('/')`
- **찜 목록의 확대·뒤집기는 그대로 둡니다.** 거기서는 "4개를 비교하다 하나를 크게 본다"는 맥락이라 오버레이가 맞습니다. 홈은 "한 장씩 넘기다 자세히 본다"라 전체 화면이 맞습니다

`/jobs/:jobId`는 비로그인도 볼 수 있게 열어두면 공유 링크가 되지만, **지금은 범위 밖**입니다. `RequireAuth` 안에 둡니다.

---

## 7. 🟢 F4 · 구직 샘플 확충 (A, 20분)

현재 25건이고 **전부 서울 성북·동대문**입니다. 지역 필터(F2)를 켜면 서울 말고는 전부 0건이라 기능이 죽어 보입니다.

`supabase/seed_nationwide.sql` — **35건 추가, 총 60건**
- 지역: 서울 15 · 경기 8 · 부산 4 · 대구 3 · 인천 3 · 대전 2 · 광주 2 · 강원 2 · 제주 2 · 그 외 2
- 직종을 11종에 고르게 분산 (지금은 카페·음식점에 몰려 있습니다)
- 시급 10,320~16,000 범위로 흩뿌리기
- 근무 시간대도 오전·오후·저녁·새벽 골고루 — **시간 필터(Phase 4)가 실제로 걸러내는 걸 보여주려면 다양해야 합니다**
- `wanted_traits`도 2~3개씩 채우기 (F7에서 표시)
- 리뷰는 공고당 1~2개

⚠️ **`work_days`는 `"월·수·금"`, `work_hours`는 `"13:00 ~ 18:00"`(공백 포함 ` ~ `)** — 시간 겹침 판정이 이 문자열을 파싱합니다. 틀리면 에러 없이 필터에서 조용히 빠집니다.
⚠️ 이미지 URL은 **실제로 200을 확인한 것만** 쓰세요. 깨진 이미지가 카드에 뜨면 데모에서 바로 티가 납니다.

---

## 8. 🟡 Tier 2 — 시간이 남으면

### F5 · 지원서 템플릿 (A 30분 + B 30분)
```sql
create table if not exists apply_templates (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade default auth.uid(),
  title      text not null,
  body       text not null,
  created_at timestamptz default now()
);
alter table apply_templates enable row level security;
create policy "own templates" on apply_templates for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on apply_templates to authenticated;
```
A: `useApplyTemplates()` → `{ templates, save(title, body), remove(id) }`
B: 지원 화면 Textarea 위에 템플릿 칩 행 — 탭하면 본문에 **붙여넣기**(덮어쓰기 아님, 커서 위치에 삽입). 우측 "현재 내용 저장" 버튼 → 제목 입력 시트

### F6 · 공고 이미지 첨부 (A 30분 + B 30분)
`avatars` 버킷과 같은 방식으로 `job-images` 버킷 신설. 경로 `job-images/{user_id}/{uuid}.jpg`.
A: `useJobImageUpload()`. B: 공고 작성 폼에 이미지 선택 + 미리보기.
**아바타에서 쓴 `revokeObjectURL` 패턴을 그대로 재사용하세요.**

### F7 · 평점 UI + "이런 분을 찾아요" (B 40분)
데이터는 Phase 6에서 준비됐습니다(`seeker_ratings`, `jobs.wanted_traits`).
- `ApplicantDetail`에 별 5개 입력 + 평균
- `BackFace`의 "근무 조건" 아래 "이런 분을 찾아요" 칩
- 내 프로필 성격과 겹치는 칩은 `bg-brand-soft text-brand` 강조

### F9 · 역할별 튜토리얼 (B 40분)

지금 튜토리얼은 **구직자의 스와이프 덱만** 다룹니다. 구인자로 가입하면 **튜토리얼이 아예 안 뜹니다** — `InteractiveTutorial`이 덱(`/`) 밖에서는 4장 슬라이드로 폴백하는데, 구인자의 첫 화면은 `/employer/applicants`라 그 4장도 구직자용 내용입니다.

**구인자 튜토리얼 신설** — `src/features/onboarding/employerSteps.ts`
1. "지원자가 카드로 옵니다" — 지원자 덱 스포트라이트
2. "오른쪽으로 밀면 관심 있어요" — 실제 스와이프 대기
3. "왼쪽은 보류예요. 사라지지 않고 보류 탭에 남습니다"
4. "공고는 여기서 직접 올려요" — 내 공고 탭 스포트라이트
5. 완료

**구직자 튜토리얼 확장** — 현재 5단계 뒤에 2개 추가
6. "찜한 공고는 4개씩 나란히 비교해요" — 찜 탭
7. "가능한 시간을 등록하면 겹치는 공고만 보여드려요" — 설정 탭

`Tutorial.tsx`가 이미 디스패처이므로 **`role`에 따라 스텝 배열만 갈아끼우면** 됩니다. 스포트라이트·앵커·폴백 기계는 그대로 재사용합니다. 새 컴포넌트를 만들지 마세요.

`localStorage` 키를 역할별로 분리하세요 — `albaswipe.tutorial.seen.seeker` / `.employer`. 한 사람이 두 역할 계정을 쓰는 데모에서 한쪽을 봤다고 다른 쪽이 안 뜨면 안 됩니다.

> 요청 문구가 "구직자의 기능에도 튜토리얼"이었는데, 구직자에게는 이미 있고 **구인자에게 없습니다.** 그래서 양쪽을 다 적었습니다. 구직자 쪽만 확장하길 원하시면 위 6·7번만 하면 됩니다.

### F8 · "사업자"→"구인자" 잔여 (A 5분)
`src/pages/SignupPage.tsx` 257·290행. 한국어 문구만, **식별자는 절대 손대지 마세요**.

---

## 9. 타임라인

| 시각 | A | B |
|---|---|---|
| 17:40 | **B1 버그(10분)** → F4 시드 확충 | **B2 버그(10분)** → F3 단일 창 |
| 18:10 | **F1 추천 알고리즘** | F1 초기 취향 + 취향 배너 |
| 18:50 | F2 지역 컬럼 🔔 | F2 지역 필터 시트 |
| 19:20 | Tier 2 (F5 또는 F6) | Tier 2 (**F9 역할별 튜토리얼** 또는 F7) |
| **20:00** | **기능 동결** | **기능 동결** |
| 20:00~20:40 | 통합 · 배포 · **실기기 리허설** | |
| 20:40 | 스와이프 기록 초기화 · 데모 계정 정리 | |

**19:20 체크포인트**: 여기서 Tier 1이 안 끝났으면 Tier 2는 시작하지 않습니다.

---

## 10. 소유권 (신규)

| 경로 | 소유 |
|---|---|
| `src/lib/recommend.ts` · `src/hooks/usePreferences.ts` | A |
| `src/hooks/useApplyTemplates.ts` · `useJobImageUpload.ts` | A |
| `supabase/schema_phase7.sql` · `seed_nationwide.sql` | A |
| `src/features/preferences/` (초기 선택 · 취향 배너) | B |
| `src/features/onboarding/employerSteps.ts` | B |
| `src/features/deck/RegionFilterSheet.tsx` | B |
| `src/pages/JobDetailPage.tsx` (F3) | B |
| `src/types.ts` | 공동 — 단독 커밋 + `contract:` + 즉시 공지 |

---

## 11. 발표에서 할 말

> "스와이프가 좋은 이유는 **넘길 때마다 취향이 학습되기** 때문입니다."

1. 홈 상단 배너: `요즘 카페 · 오후 · 식사제공 공고를 좋아하시네요`
2. 카페 공고를 연속으로 오른쪽으로 넘긴다
3. 배너가 바뀐다 → **알고리즘이 실시간으로 도는 증거**
4. "KNN 같은 협업 필터링은 사용자가 수천 명 쌓였을 때 쓸 계획이고, 지금은 콘텐츠 기반 선호 벡터로 콜드 스타트 없이 첫 사용자부터 동작합니다"

**4번을 말할 수 있으면 설계를 이해하고 있다는 신호가 됩니다.** 알고리즘을 안 쓴 게 아니라 상황에 맞는 걸 골랐다는 뜻이니까요.
