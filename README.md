# KU_Alba_Swipe

스와이프로 찾고 카드를 뒤집어 비교하는 아르바이트 탐색 앱. 해커톤 7시간 MVP.

전체 설계는 **[ALBASWIPE_SPEC.md](./ALBASWIPE_SPEC.md)** 에 있습니다. 막히면 먼저 여기를 보세요.

---

## 60초 셋업

```bash
git clone https://github.com/stu-eonho/KU_Alba_Swipe.git
cd KU_Alba_Swipe
npm install
cp .env.local.example .env.local   # 값은 팀 채널에서 복사
npm run dev
```

> **⚠️ OneDrive 폴더 안에 클론하지 마세요.** OneDrive가 `node_modules` 수천 개 파일을 동기화하려다 파일 잠금과 느려짐을 일으킵니다. `C:\dev\` 같은 경로에 클론하세요.

---

## 누가 무엇을 개발하는가

| 역할 | 담당 | 맡는 것 |
|---|---|---|
| 🅰️ 개발자 A | **@welldonebrother34543** | 데이터 · 인증 · 설정 |
| 🅱️ 개발자 B | **@stu-eonho** | 화면 · 인터랙션 · 디자인 시스템 |
| 🅲 담당 C | **@molluIdontknow** | 기획 · 디자인 · 발표 (코드 미작성) |

세 명이 서로의 파일을 건드리지 않도록 나눴습니다. **내 소유가 아닌 파일은 수정하지 않습니다.** 고쳐져야 하면 직접 고치지 말고 소유자에게 요청하세요. 전체 맵은 [`.github/CODEOWNERS`](./.github/CODEOWNERS)에 있습니다.

### 🅰️ 개발자 A — 데이터 · 인증 · 설정 · `@welldonebrother34543`

<table>
<tr><td><b>소유 폴더</b></td><td>

`supabase/` · `src/lib/` · `src/hooks/` · `src/features/auth/` · `src/features/settings/`
`src/pages/` 중 **Login · Signup · Settings**

</td></tr>
<tr><td><b>만들 것</b></td><td>

> ✅ **Supabase 셋업은 이미 끝나 있습니다.** 프로젝트 생성 · Confirm email 끄기 · `schema.sql` · `seed.sql` 실행까지 B가 미리 해뒀습니다. 공고 3개와 리뷰 7개가 들어 있고 RLS도 확인했습니다. **`.env.local` 값만 팀 채널에서 받아 넣고 3번부터 시작하세요.** (약 40분 절약)
>
> 대시보드를 봐야 할 때(Table Editor로 `swipes` 확인 등)는 B에게 Supabase 조직 초대를 요청하세요.

1. ~~Supabase 프로젝트 생성 → Confirm email 끄기 → `.env.local` 팀 공유~~ ✅ 완료
2. ~~`supabase/schema.sql` 실행 → `seed.sql` 실행~~ ✅ 완료
3. `src/types.ts` 확정 후 **즉시 푸시** — B가 이걸 기다립니다 · **여기서 시작** *(30분 안)*
4. `lib/supabase.ts` · `lib/auth-context.tsx` · 로그인/회원가입 화면 → **실제로 로그인 되는 것까지**
5. `hooks/useDeck.ts` → `useWishlist.ts` → `useReviews.ts`
6. 설정 화면 — **"스와이프 기록 초기화"를 가장 먼저** 만드세요

</td></tr>
<tr><td><b>안 건드림</b></td><td>

`src/components/` · `src/features/{deck,wishlist,apply}/` · `router.tsx` · `globals.css`

</td></tr>
</table>

### 🅱️ 개발자 B — 화면 · 인터랙션 · 디자인 시스템 · `@stu-eonho`

<table>
<tr><td><b>소유 폴더</b></td><td>

`src/components/` · `src/styles/` · `src/router.tsx` · `main.tsx` · `App.tsx`
`src/features/{deck,wishlist,apply}/` · `src/pages/` 중 **HomeDeck · Wishlist · Apply**

</td></tr>
<tr><td><b>만들 것</b></td><td>

1. `components/ui/` 프리미티브 — **Button · Input · Chip · Badge · EmptyState** · *(40분 안, A가 여기에 블로킹됨)*
2. `AppShell` + 하단 탭바(홈/찜/설정) + `router.tsx` + `RequireAuth`
3. **스와이프 덱 전체** — 이 앱의 심장. 다른 무엇보다 먼저 끝냅니다
4. 찜 목록 2×2 격자 → 카드 확대 + 뒤집기 → 뒷면 상세
5. 지원 화면
6. 빈 상태 3종 · 로딩 스켈레톤 2종

</td></tr>
<tr><td><b>안 건드림</b></td><td>

`supabase/` · `src/lib/` · `src/hooks/` · `src/features/{auth,settings}/`

</td></tr>
</table>

> **B는 A를 기다리지 않습니다.** [`src/features/deck/mockJobs.ts`](./src/features/deck/mockJobs.ts)에 실제 공고 8개가 이미 들어 있습니다. 이걸로 덱을 끝까지 만들고, A의 훅이 나오면 import 한 줄만 바꾸세요.
>
> ```ts
> const jobs = MOCK_JOBS;      // →   const { jobs } = useDeck();
> ```

### 🅲 담당 C — 기획 · 디자인 · 발표 · `@molluIdontknow`

코드를 쓰지 않습니다. 개발자 둘의 시간을 콘텐츠 작업에서 빼주는 것이 이 역할의 목적입니다.

1. **시드 공고 30개 콘텐츠** → `supabase/seed.sql`의 형식 그대로 · **시작 후 2시간 안** ⚠️
   늦으면 더미 문자열로 데모해야 하고, 심사위원이 가장 먼저 보는 게 이 데이터입니다.
2. 디자인 토큰 값 확정 → B에게 통보 · **시작 후 30분 안**. 이후 색 변경 요청은 받지 않습니다
3. 발표 자료 + 데모 대본
4. **발표 2시간 전부터 실제 휴대폰으로 리허설**, 버그를 개발자에게 전달

---

## 충돌이 나지 않게 하는 5가지 규칙

1. **브랜치를 나눠서 작업합니다.** `main`에 직접 푸시하지 않습니다. 규칙은 아래 "브랜치 전략" 참조.
2. **1시간에 한 번은 무조건 푸시합니다.** 4시간치를 한 번에 올리면 충돌이 아니라 재앙이 됩니다.
3. **`src/types.ts`는 단독 커밋으로만.** 다른 파일 변경을 섞지 말고, 커밋 메시지에 `contract:` 접두사를 붙이고, 푸시 직후 팀 채널에 알립니다. 상대는 즉시 `git pull`.
   필드 **추가는 자유**, 삭제·이름 변경은 구두 합의 후. 7시간 프로젝트에서는 지우는 것보다 optional로 남기는 게 거의 항상 옳습니다.
4. **라이브러리를 추가하면 즉시 푸시하고 알립니다.** 둘이 동시에 추가하면 lockfile이 충돌합니다.
   `package-lock.json` 충돌 시 수동 병합 금지 → `git checkout --theirs package-lock.json && npm install`
5. **Prettier 설정은 루트 하나뿐.** 개인 에디터 설정으로 덮어쓰지 마세요. 이것 때문에 diff가 폭발하면 충돌 해결이 불가능해집니다.

가장 자주 터지는 파일: `router.tsx`(B 단독) · `globals.css`(B 단독) · `package.json`(공지 필수) · `schema.sql`(A 단독)

---

## 브랜치 전략

```
main  ← 항상 빌드되는 상태. 데모는 여기서 배포한다. 직접 푸시 금지.
 ├── a/<모듈>   개발자 A 작업     예) a/auth, a/hooks, a/settings
 └── b/<모듈>   개발자 B 작업     예) b/ui-foundation, b/swipe-deck, b/wishlist
```

**브랜치 접두사가 곧 소유자다.** `a/`로 시작하면 A의 것, `b/`면 B의 것. 남의 접두사 브랜치에 푸시하지 않습니다.

### 작업 흐름

```bash
# 1. 시작할 때 — 항상 최신 main에서 자른다
git checkout main && git pull
git checkout -b b/swipe-deck

# 2. 작업 중 — 자주 커밋하고 자기 브랜치에 푸시
git add -A && git commit -m "feat: 스와이프 제스처"
git push -u origin b/swipe-deck

# 3. 끝났을 때 — main을 먼저 당겨 충돌을 내 브랜치에서 해결한다
git fetch origin
git rebase origin/main        # 충돌 나면 여기서 해결
npm run build                 # 통과해야 머지 자격이 생긴다
git checkout main && git pull
git merge b/swipe-deck && git push
```

### 규칙

1. **머지 조건은 `npm run build` 통과 하나다.** 깨진 코드를 main에 넣으면 상대방이 그 위에서 작업하다 같이 막힌다.
2. **충돌은 자기 브랜치에서 해결한다.** main으로 가져가서 해결하지 않습니다. `git rebase origin/main`을 자기 브랜치에서 먼저 돌립니다.
3. **모듈 하나 끝나면 바로 머지한다.** 브랜치를 오래 들고 있을수록 충돌이 커집니다. 하루 종일 살아있는 브랜치를 만들지 않습니다.
4. **최소 1시간에 한 번은 자기 브랜치에 푸시한다.** 로컬에만 있으면 사고 시 통째로 날아갑니다.
5. **PR은 만들지 않습니다.** 셀프 머지로 갑니다. 리뷰할 시간이 없고, 소유권이 갈려 있어 서로의 코드를 볼 일이 적습니다.
6. `package-lock.json` 충돌 시 수동 병합 금지 → `git checkout --theirs package-lock.json && npm install`

### 지금 살아있는 브랜치

| 브랜치 | 소유 | 상태 |
|---|---|---|
| `main` | 공용 | 안정. 빌드 통과 |
| `b/ui-foundation` | B | UI 프리미티브 8종 + 레이아웃 + 라우터 작업 중 |
| `develop` | nous | main보다 뒤처져 있음 — **main을 머지해서 따라잡아야 합니다** |

---

## 타임라인 (7시간)

| 시각 | 체크포인트 | A | B |
|---|---|---|---|
| 0:00–0:45 | **CP1** 둘 다 `npm run dev` 성공 | `.env.local` 넣기 · **`types.ts` 푸시** (Supabase 셋업 ✅ 완료됨) | 토큰 + 버튼/인풋 |
| 0:45–2:30 | **CP2** 로그인 실제 동작 / 카드 날아감 | 스키마·시드 · 로그인 · `useDeck` | 탭바·라우터 · **스와이프 덱** |
| 2:30–4:00 | **CP3 최초 통합** ⚠️ | `useWishlist` · 기록 초기화 · **Vercel 배포 1회** | 찜 2×2 격자 앞면 |
| 4:00–5:30 | **CP4** 뒤집기 동작 | `useReviews` | 카드 확대+뒤집기 · 뒷면 · 지원 화면 |
| 5:30–6:30 | 완성도 | 시드 30개 교체 | 빈 상태 · 스켈레톤 · aria-label |
| 6:30–7:00 | **CP5 기능 동결** | 배포 확인 · 리허설 · 기록 초기화. **새 기능 금지** | |

**CP3가 4시간 안에 안 되면 남은 기능을 포기하고 이것부터 살립니다.**

### 시간이 부족할 때 자르는 순서

위에서부터 버립니다. **1** 접근성 다듬기 → **2** 지원 기능 실제 저장(버튼만 남김) → **3** 카드 뒤집기 회전(확대만 남김) → **4** 설정 화면 통계 숫자 → **5** 키보드 단축키

절대 자르지 않는 것: **회원가입 · 스와이프 · 찜 2×2 격자 · 격자 카드 탭 시 상세 노출**

---

## 시간을 잡아먹는 함정 10가지

시작 전에 한 번 읽으면 각각 20~40분을 아낍니다.

| # | 함정 | 대응 |
|---|---|---|
| 1 | Supabase **Confirm email이 켜져 있음** | 대시보드에서 먼저 끈다. 안 끄면 가입 후 로그인이 안 된다 |
| 2 | 스와이프 0건일 때 `.not('id','in','()')` | SQL 문법 오류. 빈 배열 분기 필수. **신규 가입 첫 화면에서 터진다** |
| 3 | `insert` 사용 | `upsert`를 쓴다. UNIQUE 제약 때문에 재시도·중복 탭에서 즉시 에러 |
| 4 | `if (error) throw error` 누락 | supabase-js는 throw하지 않는다. 빠뜨리면 실패가 조용히 무시되고 빈 화면만 나온다 |
| 5 | 세션 복구 중 `isLoading` 미처리 | 새로고침마다 로그인 화면이 깜빡인다 |
| 6 | 입력 폰트 16px 미만 | iOS Safari에서 탭할 때 화면이 자동 확대된다 |
| 7 | SPA rewrite 미설정 | 배포판에서 `/wishlist` 직접 열면 404 (Vercel은 Vite 프리셋이 자동 처리) |
| 8 | Supabase **Site URL 미등록** | 배포판에서 로그인이 실패한다 |
| 9 | `touch-action: none` 누락 | 카드 드래그할 때 페이지가 같이 스크롤된다 |
| 10 | `100vh` 사용 | iOS 주소창 때문에 탭바가 화면 밖으로 밀린다. `100dvh`를 쓴다 |

---

## 기술 스택

React 19 · Vite 8 · TypeScript 5.9 · Tailwind 4 · React Router 7 · TanStack Query 5 · motion 13 · @use-gesture/react 10 · Supabase (PostgreSQL + Auth)

**백엔드 서버 코드가 없습니다.** 프론트엔드가 Supabase를 직접 호출하고, 보안 경계는 서버가 아니라 **Row Level Security 정책**입니다. `supabase/schema.sql` 실행 후 Table Editor에서 세 테이블 모두 방패 아이콘이 켜져 있는지 눈으로 확인하세요.

`VITE_SUPABASE_ANON_KEY`에는 반드시 **anon(public) 키**를 넣습니다. service_role 키를 넣으면 RLS가 전부 무시되어 모든 사용자의 데이터가 공개됩니다.

---

## 명령어

```bash
npm run dev       # 개발 서버 (--host 포함 → 같은 와이파이의 휴대폰에서 접속 가능)
npm run build     # dist/ 생성
npm run preview   # 빌드 결과 확인
npm run lint
npm run format
```

**스와이프와 카드 뒤집기는 반드시 실제 휴대폰에서 확인하세요.** 데스크톱 브라우저의 터치 에뮬레이션은 실제 제스처와 다르게 동작합니다. `npm run dev` 실행 시 출력되는 Network 주소를 폰에서 여세요.
