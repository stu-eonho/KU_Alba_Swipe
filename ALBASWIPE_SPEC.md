<project_specification>

<project_name>
AlbaSwipe - 스와이프로 찾고 카드를 뒤집어 비교하는 아르바이트 탐색 앱 (해커톤 7시간 MVP)
</project_name>

<overview>
AlbaSwipe는 아르바이트 공고를 틴더처럼 카드로 넘기며 탐색하는 모바일 우선 웹 앱이다. 홈 화면에서 공고 카드를 왼쪽(관심 없음) 또는 오른쪽(찜)으로 넘기고, 찜한 공고는 찜 목록에서 2x2 격자로 한눈에 비교한다. 격자의 카드를 탭하면 카드가 뒤집히며 리뷰·주소·상세 설명이 드러나고, 뒷면의 "지원하기" 버튼으로 지원 화면에 진입한다.

화면은 하단 탭 3개가 전부다: **홈(스와이프) · 찜 목록 · 설정**. 여기에 회원가입/로그인 화면과 지원 화면이 붙는다.

CRITICAL: 이 스펙은 **발표까지 7시간, 개발자 2명** 조건에 맞춰 의도적으로 잘라낸 rough MVP다. 구인자(공고 등록) 기능, 이미지 업로드, 추천 알고리즘, 필터, 지원 내역 관리는 전부 범위 밖이다. 공고 데이터는 시드로 미리 넣고 앱은 읽기만 한다. 기능을 추가하고 싶어지면 `<scope_boundaries>`의 out_of_scope를 먼저 읽는다.

CRITICAL: **백엔드 서버를 만들지 않는다.** Supabase(PostgreSQL + Auth)를 프론트엔드에서 직접 호출한다. Express/NestJS 서버, 자체 JWT 구현, 배포용 서버 인스턴스가 모두 없다. 보안 경계는 서버 코드가 아니라 **Supabase Row Level Security 정책**이다 — 이것만 제대로 걸면 anon key가 공개돼도 안전하다.

CRITICAL: 모바일 우선. 데스크톱에서는 최대 폭 480px 컨테이너를 중앙 정렬해 모바일 레이아웃을 그대로 보여준다. 데스크톱 전용 레이아웃은 만들지 않는다. 단일 로케일(ko-KR).
</overview>

<assumptions>
- 아키텍처: 사용자가 "Supabase BaaS (서버 코드 0줄)"를 선택함. 개발자 A가 데이터·인증, B가 화면을 맡아 역할이 겹치지 않는다. 서버가 필요해지면 Supabase Edge Function을 추가하는 것이 가장 싼 경로이며, 프론트엔드 호출부(`src/lib/api/`)만 바꾸면 된다.
- 공고 데이터: 구인자 기능이 범위 밖이므로 **시드 30개를 SQL로 주입하고 앱은 읽기 전용**으로 다룬다고 가정. 시드 콘텐츠(가게명·직종·시급·설명·리뷰)는 기획/디자인 담당(C)이 작성한다.
- 이미지: 업로드 기능 없음. 시드 데이터에 외부 이미지 URL(Unsplash 등)을 직접 박는다고 가정. 사용자가 "이미지 데모가 무엇인지 모르겠다"고 답했고, 그 기능은 구인자 화면에 붙어 있어 함께 제외된다.
- 프로필 테이블: 별도 `profiles` 테이블을 만들지 않고 Supabase `auth.users`의 `user_metadata.nickname`을 쓴다고 가정. 테이블 하나와 트리거 하나를 줄여 30분 이상을 아낀다. 프로필 항목이 늘어나면 그때 테이블을 만든다.
- 찜 = 오른쪽 스와이프: 별도 wishlist 테이블 없이 `swipes` 테이블의 `direction = 'right'`로 판정한다고 가정. 찜 해제는 행 삭제가 아니라 `direction`을 `'left'`로 UPDATE하는 것이며, 그래야 해제한 공고가 덱에 다시 나타나지 않는다.
- 이메일 인증: Supabase 대시보드에서 **Confirm email을 끈다**고 가정. 켜져 있으면 가입 직후 로그인이 막혀 데모가 불가능하다.
- 지원 기능: 사용자가 "버튼만 넣고 기능은 시간에 따라"라고 했으므로, **지원 화면과 버튼은 만들되 실제 저장은 Phase 4 선택 항목**으로 둔다. 시간이 남으면 `applications` 테이블 하나만 추가하면 된다.
- 팀 구성: 개발자 2명 + 기획/디자인 1명(C). C는 코드를 쓰지 않고 시드 콘텐츠·디자인 값·발표 자료를 담당한다고 가정.
- 브라우저: 최신 Chrome / iOS Safari 16+ 만 지원.
</assumptions>

<open_questions>
- Q1. 시드 공고 30개의 실제 콘텐츠(가게명·직종·시급·설명·리뷰)를 누가 언제까지 주는가? → 담당 C가 **시작 후 2시간 안에** `seed.sql`에 채워 넣지 못하면 개발자 A가 faker로 임시 생성해야 하고, 데모의 설득력이 크게 떨어진다. 이 스펙에서 가장 먼저 확정해야 할 항목이다.
- Q2. 지원 기능을 실제로 저장할 것인가, 버튼만 둘 것인가? → Phase 4에서 결정. 저장한다면 `applications` 테이블 1개 + INSERT 1줄이면 되므로 30분이면 충분하다. 결정을 5시간 시점까지 미뤄도 된다.
- Q3. 데모 때 실제 회원가입을 시연하는가, 미리 만든 계정으로 로그인만 하는가? → 시연한다면 이메일 형식 제약(`@` 포함)만 지키면 되고, 로그인만 한다면 시드 계정 1개를 미리 만들어 두고 스와이프 이력을 비워 둬야 한다.
</open_questions>

<scope_boundaries>
  <in_scope>
    - 이메일/비밀번호 회원가입 및 로그인 (Supabase Auth)
    - 홈: 공고 카드 스와이프 덱 — 좌(관심 없음) / 우(찜), 드래그·버튼·키보드 3가지 입력
    - 찜 목록: 2x2 격자로 4개씩 비교 (가게명 · 직종 · 시급 · 한 줄 요약)
    - 격자 카드 탭 → 카드가 확대되며 뒤집혀 상세 정보 노출 (리뷰, 주소, 상세 설명, 근무 조건)
    - 뒷면의 "지원하기" 버튼 → 지원 화면 진입
    - 지원 화면: 공고 요약 + 메시지 입력 + 제출 버튼 (실제 저장은 Q2에 따라 결정)
    - 찜 해제
    - 설정: 닉네임·이메일 표시, 스와이프 이력 초기화, 로그아웃
    - 공고 30개 + 리뷰 시드 데이터
  </in_scope>
  <out_of_scope>
    - 구인자(사업주) 기능 전체 — 공고 등록/수정/마감, 지원자 관리, 구인자 회원가입
    - 이미지 업로드 (시드 URL만 사용)
    - 검색, 필터, 정렬
    - 추천 알고리즘 (덱은 단순 무작위 순서)
    - 지원 내역 조회 화면, 지원 상태 관리
    - 소셜 로그인, 비밀번호 재설정, 이메일 인증
    - 채팅, 알림, 지도
    - 다크 모드, 다국어
    - 되돌리기(undo), 메모, 무한 스크롤 페이지네이션
    - 자동화 테스트 (수동 시나리오 검증만)
  </out_of_scope>
  <future_considerations>
    - 지원 기능 실제 저장 (Phase 4, Q2)
    - 구인자 웹 (Phase 2)
    - 조건 기반 추천 (Phase 2 — `swipes` 데이터가 이미 쌓이고 있다)
    - 되돌리기, 필터 (Phase 2)
  </future_considerations>
</scope_boundaries>

<technology_stack>
  <frontend_application>
    <framework>React 19.3.0 + react-dom 19.3.0</framework>
    <language>TypeScript 5.9.3 (strict). npm 최신은 7.0.2이지만 주변 툴링 호환이 불안정해 5.9.3으로 고정한다.</language>
    <build_tool>Vite 8.3.0 (@vitejs/plugin-react)</build_tool>
    <styling>Tailwind CSS 4.3.3 — config 파일 없이 `src/styles/globals.css`의 `@theme` 블록에 토큰 정의</styling>
    <routing>react-router-dom 7.18.3 (createBrowserRouter)</routing>
    <server_state>@tanstack/react-query 5.102.8 — CRITICAL: queryKey를 `['jobs']`, `['swipes']`, `['reviews', jobId]` 세 개만 쓴다. rough MVP에서 캐시 구조를 복잡하게 만들지 않는다.</server_state>
    <animation>motion 13.2.0 (Framer Motion의 현재 패키지명) — 스와이프 날아가기, 카드 뒤집기, layoutId 확대 전환</animation>
    <gesture>@use-gesture/react 10.3.1 — 드래그 좌표·속도 추출</gesture>
    <icons>lucide-react 1.45.0 — 기본 20px, stroke 1.75</icons>
    <utils>clsx 2.1.1</utils>
  </frontend_application>

  <backend>
    <note>CRITICAL: 백엔드 서버 코드가 없다. 아래는 전부 Supabase가 제공하는 것이며 우리가 배포하거나 운영하지 않는다.</note>
    <database>Supabase managed PostgreSQL 16</database>
    <auth>Supabase Auth (이메일/비밀번호). 세션·토큰 갱신·저장은 SDK가 전부 처리한다. 자체 JWT 구현을 하지 않는다.</auth>
    <client_sdk>@supabase/supabase-js 2.116.0 — 프론트엔드에서 직접 호출</client_sdk>
    <security_boundary>Row Level Security 정책. `<security_considerations>` 참조. CRITICAL: RLS를 켜지 않은 테이블이 하나라도 있으면 anon key로 전체 데이터가 읽고 쓰인다.</security_boundary>
  </backend>

  <tooling>
    <linter>ESLint 10.10.0 (flat config)</linter>
    <formatter>Prettier 3.9.6 — printWidth 100, singleQuote true. CRITICAL: 루트에 설정 파일 하나만 둔다. 두 사람의 포매터 설정이 다르면 저장할 때마다 전체 파일이 재포맷돼 diff가 폭발한다.</formatter>
    <package_manager>npm (Node.js 22 LTS 동봉). 모노레포가 아니므로 pnpm 워크스페이스가 필요 없다.</package_manager>
  </tooling>

  <versions_note>
    모든 버전은 2026-09-12 기준 npm registry에서 실제 조회해 고정했다. `package.json`에 캐럿(^) 없이 정확한 버전을 적고 `package-lock.json`을 반드시 커밋한다.
  </versions_note>
</technology_stack>

<prerequisites>
  <environment_setup>
    - Node.js 22 LTS 이상 (22 미만이면 Vite 8이 동작하지 않는다)
    - Supabase 프로젝트 1개 (무료 티어)
    - CRITICAL: Supabase 대시보드 > Authentication > Providers > Email 에서 **"Confirm email"을 끈다.** 켜져 있으면 가입 직후 로그인이 막혀 데모가 불가능하다. 이걸 놓치면 3시간쯤 뒤에 "왜 로그인이 안 되지"로 30분을 날린다.
    - Git 저장소 1개, 기본 브랜치 `main`
    - `.env.local` 파일을 팀 채널로 공유 (저장소 커밋 금지)
  </environment_setup>
  <build_configuration>
    - `vite.config.ts`: 기본 설정 + `server.host = true` (실기기 테스트용 LAN 노출)
    - `tsconfig.json`: paths 별칭 `@/*` → `src/*`
    - Tailwind v4는 config 파일 없이 `src/styles/globals.css`의 `@theme` 블록에 토큰을 정의한다
    - 첫 셋업: `npm install` → Supabase SQL Editor에서 `supabase/schema.sql` 실행 → `supabase/seed.sql` 실행 → `npm run dev`
  </build_configuration>
</prerequisites>

<environment_variables>
  <variable>
    <name>VITE_SUPABASE_URL</name>
    <description>Supabase 프로젝트 URL. 클라이언트 노출 전제(공개되어도 안전).</description>
    <required>true</required>
    <example>https://abcdefghijklm.supabase.co</example>
  </variable>
  <variable>
    <name>VITE_SUPABASE_ANON_KEY</name>
    <description>Supabase anon(public) 키. 브라우저 번들에 그대로 포함되며 공개를 전제로 설계된 키다. 실제 방어선은 RLS 정책이다.</description>
    <required>true</required>
    <example>eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSJ9...</example>
    <note>CRITICAL: service_role 키를 여기에 넣으면 RLS가 전부 무시되어 모든 사용자의 데이터가 공개된다. 반드시 anon 키여야 한다.</note>
  </variable>
</environment_variables>

<file_structure>
albaswipe/
├── package.json
├── .env.local.example              # 환경변수 템플릿 (.env.local은 커밋 금지)
├── .gitignore                      # .env.local 포함 확인
├── eslint.config.js
├── .prettierrc                     # 루트 단일, 개인 설정으로 덮어쓰기 금지
├── index.html
├── vite.config.ts
├── tsconfig.json
├── README.md                       # 셋업 3줄 + 담당자별 시작 지점
│
├── supabase/                       # [개발자 A 단독 소유]
│   ├── schema.sql                  # 테이블 3개 + RLS 정책 전부
│   └── seed.sql                    # 공고 30개 + 리뷰 (콘텐츠는 담당 C가 작성)
│
└── src/
    ├── main.tsx                    # [B] 프로바이더 조립
    ├── App.tsx                     # [B] RouterProvider
    ├── router.tsx                  # [B 단독 소유] 라우트 + 가드
    ├── styles/
    │   └── globals.css             # [B 단독 소유] Tailwind @theme 토큰
    │
    ├── types.ts                    # [공동 소유] Job, Review, Swipe 타입 — 계약 파일
    │
    ├── lib/                        # [개발자 A 단독 소유]
    │   ├── supabase.ts             # createClient 싱글턴
    │   ├── auth-context.tsx        # AuthProvider + useAuth 훅
    │   └── api/
    │       ├── jobs.ts             # fetchDeckJobs, fetchJobDetail, fetchReviews
    │       └── swipes.ts           # createSwipe, fetchWishlist, unwishlist, resetSwipes
    │
    ├── hooks/                      # [개발자 A 단독 소유]
    │   ├── useDeck.ts              # 덱 공고 목록 + 스와이프 mutation
    │   ├── useWishlist.ts          # 찜 목록 + 해제
    │   └── useReviews.ts           # 공고별 리뷰
    │
    ├── components/                 # [개발자 B 단독 소유]
    │   ├── ui/                     # Button, Input, Chip, Badge, EmptyState, Skeleton, Spinner
    │   └── layout/                 # AppShell, TopBar, BottomTabBar
    │
    ├── features/
    │   ├── auth/                   # [A] SignupForm, LoginForm
    │   ├── deck/                   # [B] SwipeCard, CardStack, SwipeControls, useSwipeGesture
    │   ├── wishlist/               # [B] WishlistGrid, GridCard, FlipCard(앞/뒷면)
    │   ├── apply/                  # [B] ApplyForm
    │   └── settings/               # [A] SettingsMenu
    │
    └── pages/                      # 라우트 엔트리. features를 얇게 감싸기만 한다
        ├── LoginPage.tsx           # [A]
        ├── SignupPage.tsx          # [A]
        ├── HomeDeckPage.tsx        # [B]
        ├── WishlistPage.tsx        # [B]
        ├── ApplyPage.tsx           # [B]
        └── SettingsPage.tsx        # [A]
</file_structure>

<team_workstreams>
  <principle>
    CRITICAL: 충돌 방지 원칙은 "같은 파일을 두 사람이 열지 않는다"이다. 위 파일 구조의 `[A]` / `[B]` 표시가 소유권이며, 남의 파일이 고쳐져야 하면 직접 고치지 말고 요청한다. 공동 소유는 `src/types.ts` 단 하나다.
    2명뿐이라 PR 리뷰는 하지 않는다. 대신 **1시간에 한 번은 반드시 푸시한다.** 7시간짜리 프로젝트에서 4시간치 작업을 한 번에 올리면 충돌이 아니라 재앙이 된다.
  </principle>

  <workstream id="A" name="데이터 · 인증 · 설정">
    <owns>`supabase/**`, `src/lib/**`, `src/hooks/**`, `src/features/auth/**`, `src/features/settings/**`, `pages/LoginPage.tsx`, `pages/SignupPage.tsx`, `pages/SettingsPage.tsx`</owns>
    <deliverables>
      1. Supabase 프로젝트 생성 + Confirm email 끄기 + `.env.local` 팀 공유 (**0순위, 20분 안에. B가 여기에 블로킹되지는 않지만 통합이 여기서 시작된다**)
      2. `schema.sql`: 테이블 3개 + RLS 정책 전부 + 인덱스
      3. `seed.sql`: 공고 30개 + 리뷰 (콘텐츠는 담당 C가 주는 대로 채움)
      4. `src/types.ts` 작성 후 즉시 푸시 (**B가 이걸 기다린다. 30분 안에**)
      5. `lib/supabase.ts` + `auth-context.tsx` + 로그인/회원가입 화면
      6. 데이터 훅 3개: `useDeck`, `useWishlist`, `useReviews` — B는 이 훅만 호출하고 Supabase를 직접 부르지 않는다
      7. 설정 화면
    </deliverables>
    <never_touches>`src/components/**`, `src/features/{deck,wishlist,apply}/**`, `router.tsx`, `globals.css`</never_touches>
  </workstream>

  <workstream id="B" name="화면 · 인터랙션">
    <owns>`src/components/**`, `src/styles/globals.css`, `router.tsx`, `main.tsx`, `App.tsx`, `src/features/{deck,wishlist,apply}/**`, `pages/HomeDeckPage.tsx`, `pages/WishlistPage.tsx`, `pages/ApplyPage.tsx`</owns>
    <deliverables>
      1. `globals.css` 토큰 + UI 프리미티브 5종(Button, Input, Chip, Badge, EmptyState) (**0순위, 40분 안에**)
      2. AppShell + BottomTabBar + router (가드는 A의 `useAuth`를 받아 쓴다)
      3. **스와이프 덱 전체** — 이 앱의 심장. 다른 무엇보다 먼저 완성한다. A의 훅이 없는 동안은 `types.ts` 타입에 맞춘 하드코딩 배열로 개발한다
      4. 찜 목록 2x2 격자 + 카드 뒤집기
      5. 지원 화면
      6. 빈 상태 / 로딩 스켈레톤
    </deliverables>
    <never_touches>`supabase/**`, `src/lib/**`, `src/hooks/**`, `src/features/{auth,settings}/**`</never_touches>
    <mock_strategy>
      CRITICAL: B는 A를 기다리지 않는다. `src/features/deck/mockJobs.ts`에 `types.ts`의 `Job` 타입을 만족하는 배열 8개를 직접 만들고 그걸로 개발한다. A의 `useDeck`이 준비되면 import 한 줄만 바꾼다. 이 파일은 B 소유이며 통합 후 삭제한다.
    </mock_strategy>
  </workstream>

  <workstream id="C" name="기획 · 디자인 · 발표">
    <note>코드를 쓰지 않는다. 개발자 2명의 시간을 콘텐츠 작업에서 빼주는 것이 이 역할의 목적이다.</note>
    <deliverables>
      1. **시드 공고 30개 콘텐츠** (가게명 / 직종 / 시급 / 한 줄 요약 / 상세 설명 / 주소 / 리뷰 2~3개 / 이미지 URL) — 스프레드시트로 작성해 A에게 전달 (**시작 후 2시간 안에. 이게 늦으면 데모의 설득력이 무너진다 — Q1**)
      2. 디자인 토큰 값 확정 — `<aesthetic_guidelines>`의 색/폰트를 그대로 쓸지, 바꿀지 **시작 후 30분 안에** 결정해서 B에게 전달. 이후 색 변경 요청은 받지 않는다
      3. 발표 자료 + 데모 시나리오 대본
      4. **발표 2시간 전부터 실제 휴대폰으로 시나리오 1·2를 반복 리허설**하고 버그를 개발자에게 넘긴다
    </deliverables>
  </workstream>

  <contract_file>
    CRITICAL: `src/types.ts`가 유일한 공동 소유 파일이자 A와 B 사이의 계약이다.
    1. A가 먼저 작성해 30분 안에 푸시한다. B는 이 타입에 맞춰 목데이터를 만든다.
    2. 변경할 때는 **이 파일만 담은 단독 커밋**으로 올리고 즉시 팀 채널에 알린다. 상대는 바로 `git pull`한다.
    3. **필드 추가는 자유, 삭제·이름 변경은 구두 합의 후.** 7시간짜리 프로젝트에서는 필드를 지우는 것보다 optional로 남기는 게 거의 항상 옳다.
  </contract_file>

  <git_conventions>
    - 브랜치 없이 `main`에 직접 푸시한다. 2명 · 7시간에 PR 흐름은 순손해다. 대신 푸시 전 반드시 `git pull --rebase`.
    - 커밋 단위는 작게, 최소 1시간에 한 번 푸시.
    - `package-lock.json` 충돌 시 수동 병합하지 말고 `git checkout --theirs package-lock.json && npm install`로 재생성한다.
    - 라이브러리를 추가하면 즉시 푸시하고 알린다. 두 사람이 동시에 추가하면 lockfile이 충돌한다.
  </git_conventions>

  <checkpoints>
    - **CP1 (+0:45)** — `npm run dev`가 두 사람 모두에서 뜨고, `types.ts`가 푸시됐고, B의 디자인 토큰 + 버튼이 화면에 보인다. 여기서 막히면 둘이 같이 붙는다.
    - **CP2 (+2:30)** — A: 로그인이 실제로 되고 `useDeck`이 시드 공고를 반환한다. B: 목데이터로 카드가 좌우로 날아간다.
    - **CP3 (+4:00)** — 최초 통합. 로그인 → 홈에서 실제 공고 스와이프 → 찜 목록에 나타남. **이게 4시간 안에 안 되면 남은 기능을 포기하고 이것부터 살린다.**
    - **CP4 (+5:30)** — 카드 뒤집기 + 지원 화면까지 동작. 이후는 다듬기만.
    - **CP5 (-0:30) 기능 동결** — 배포 확인, 시드 정리, 리허설만. 새 기능 금지.
  </checkpoints>
</team_workstreams>

<core_data_entities>
  <auth_users>
    설명: Supabase가 관리하는 내장 테이블(`auth.users`). 우리가 만들지 않고 스키마도 바꾸지 않는다.
    - id: uuid (PK, `auth.uid()`로 참조)
    - email: string (unique)
    - user_metadata: json — `{ "nickname": "string" }` 만 저장한다
    - created_at: timestamptz
    CRITICAL: 별도 `profiles` 테이블을 만들지 않는다. 닉네임은 가입 시 `signUp({ options: { data: { nickname } } })`로 넣고, 읽을 때는 `user.user_metadata.nickname`으로 꺼낸다. 테이블 하나와 트리거 하나를 줄이는 것이 7시간 프로젝트에서는 큰 차이다.
  </auth_users>

  <jobs>
    설명: 공고. 시드로만 주입되며 앱에서는 읽기 전용이다.
    - id: uuid (PK, default gen_random_uuid())
    - store_name: text (required, 가게명 — 격자 카드 앞면 1행)
    - category: text (required, 직종. 값: 카페, 음식점, 편의점, 판매, 배달, 물류, 사무, 과외, 행사, 주방, 기타)
    - hourly_wage: integer (required, 시급 원 단위)
    - summary: text (required, 한 줄 요약 — "어떠한 일인지". 격자 카드 앞면에 2줄까지 표시, 최대 60자)
    - description: text (required, 상세 설명. 카드 뒷면. 최대 1000자)
    - address: text (required, 가게 주소. 카드 뒷면)
    - work_days: text (required, 예 "월·수·금")
    - work_hours: text (required, 예 "09:00 ~ 14:00")
    - benefits: text[] (복리후생 태그, 최대 4개. 예: 식사제공, 주휴수당, 초보가능)
    - rating: numeric(2,1) (평점 0.0~5.0)
    - review_count: integer (default 0)
    - image_url: text (외부 이미지 URL. null이면 카테고리 기본 그라디언트)
    - created_at: timestamptz (default now())
    인덱스: 없음. 30건짜리 테이블에 인덱스는 의미가 없다.
    CRITICAL: 시급은 정수 원 단위다. 소수점이나 문자열을 쓰지 않는다.
  </jobs>

  <job_reviews>
    설명: 공고별 리뷰. 카드 뒷면에 2~3개 노출된다. 시드 전용, 앱에서 작성 불가.
    - id: uuid (PK)
    - job_id: uuid (FK → jobs.id, on delete cascade)
    - author_name: text (required, 예 "김**")
    - rating: integer (1~5)
    - content: text (required, 최대 200자)
    - created_at: timestamptz
    인덱스: (job_id)
  </job_reviews>

  <swipes>
    설명: 스와이프 이벤트. **찜 목록의 근거이자 덱 제외의 근거**로 동시에 쓰인다. 이 앱에서 유일하게 사용자가 쓰는 테이블이다.
    - id: uuid (PK)
    - user_id: uuid (required, FK → auth.users.id, on delete cascade, default auth.uid())
    - job_id: uuid (required, FK → jobs.id, on delete cascade)
    - direction: text (required, CHECK in ('left','right'))
    - created_at: timestamptz (default now())
    제약: UNIQUE (user_id, job_id)
    인덱스: (user_id, direction, created_at desc)
    CRITICAL: 이 테이블 하나가 세 가지 역할을 한다.
    1. 덱 조회 시 이 테이블에 행이 있는 공고를 제외한다 (좌·우 무관, 이미 본 것)
    2. `direction = 'right'`인 행이 곧 찜 목록이다 (별도 wishlist 테이블 없음)
    3. 찜 해제는 행 삭제가 아니라 `direction`을 `'left'`로 UPDATE한다. 삭제하면 그 공고가 덱에 다시 나타나는데, 이건 사용자가 기대하는 동작이 아니다.
    CRITICAL: UNIQUE 제약이 있으므로 INSERT가 아니라 **upsert**(`onConflict: 'user_id,job_id'`)로 저장한다. 낙관적 UI에서 중복 요청이 정상적으로 발생하기 때문이다.
  </swipes>

  <applications>
    설명: 지원. **Q2에서 "실제 저장"으로 결정될 때만 만든다.** 그전까지는 테이블을 만들지 않는다.
    - id: uuid (PK)
    - user_id: uuid (FK → auth.users.id, default auth.uid())
    - job_id: uuid (FK → jobs.id)
    - message: text (최대 300자)
    - created_at: timestamptz
    제약: UNIQUE (user_id, job_id)
  </applications>
</core_data_entities>

<authentication>
  <strategy>Supabase Auth 전적으로 위임. 자체 JWT·해싱·토큰 갱신 코드를 한 줄도 쓰지 않는다.</strategy>
  <signup>
    - `supabase.auth.signUp({ email, password, options: { data: { nickname } } })`
    - 비밀번호 규칙: **6자 이상** (Supabase 기본값). rough MVP에서 더 빡빡하게 만들지 않는다
    - CRITICAL: 대시보드에서 Confirm email이 꺼져 있어야 가입 즉시 세션이 생긴다
    - 가입 성공 → 자동 로그인 상태가 되므로 곧바로 `/`(홈)로 보낸다
  </signup>
  <login>
    - `supabase.auth.signInWithPassword({ email, password })`
    - 실패는 이유를 구분하지 않고 "이메일 또는 비밀번호가 올바르지 않습니다" 한 문구로 처리한다
  </login>
  <session>
    - 저장·갱신 전부 supabase-js가 처리한다 (기본적으로 localStorage + 자동 refresh)
    - `AuthProvider`가 마운트 시 `supabase.auth.getSession()`을 호출하고 `onAuthStateChange`를 구독해 전역 상태를 유지한다
    - 세션 복구 중에는 `isLoading: true`이며, 이 동안 전체 화면 스피너를 보여준다. CRITICAL: 이 처리가 없으면 새로고침할 때마다 로그인 화면이 깜빡 보였다가 홈으로 튄다 — 데모에서 가장 티 나는 버그다
  </session>
  <logout>`supabase.auth.signOut()` 후 `/login`으로 이동. react-query 캐시도 함께 비운다(`queryClient.clear()`).</logout>
  <protected_routes>
    - `/`, `/wishlist`, `/settings`, `/apply/:jobId` — 로그인 필요
    - `/login`, `/signup` — 공개. 이미 로그인 상태면 `/`로 리다이렉트
    - 비로그인이 보호 라우트 접근 → `/login`으로 이동. rough MVP이므로 원래 경로 보존(redirect 쿼리)은 하지 않는다
  </protected_routes>
  <guard_implementation>
    `<RequireAuth>` 래퍼 컴포넌트 하나로 구현한다. `useAuth()`의 `isLoading`이 true면 스피너, `user`가 null이면 `<Navigate to="/login" replace />`, 아니면 children.
  </guard_implementation>
</authentication>

<route_definitions>
  <public_routes>
    <route path="/login" page="LoginPage" />
    <route path="/signup" page="SignupPage" />
  </public_routes>
  <protected_routes guard="RequireAuth">
    <route path="/" page="HomeDeckPage" />
    <route path="/wishlist" page="WishlistPage" />
    <route path="/apply/:jobId" page="ApplyPage" />
    <route path="/settings" page="SettingsPage" />
  </protected_routes>
  <redirects>
    <redirect from="*" to="/" status="302" />
  </redirects>
  <note>404 전용 화면을 만들지 않는다. 모르는 경로는 전부 홈으로 보낸다 — 7시간 안에서 404 화면은 투자 대비 효과가 없다.</note>
</route_definitions>

<component_hierarchy>
  <app_shell>
    <providers>
      QueryClientProvider → AuthProvider → RouterProvider
      CRITICAL: AuthProvider가 QueryClientProvider 안쪽이어야 로그아웃 시 캐시를 비울 수 있다. 순서를 바꾸지 않는다.
    </providers>
    <public_layout>
      page_container (max-width 480px 중앙 정렬)
      outlet — LoginPage / SignupPage
    </public_layout>
    <main_layout>
      top_bar (56px, 화면 제목)
      outlet — HomeDeckPage / WishlistPage / SettingsPage
      bottom_tab_bar (64px + safe-area, 3탭: 홈 / 찜 / 설정)
    </main_layout>
    <fullscreen_layout>
      outlet — ApplyPage (탭바 없음, 상단에 뒤로가기만)
    </fullscreen_layout>
  </app_shell>

  <deck_tree>
    HomeDeckPage
    └── CardStack (DOM에 카드 3장까지만)
        ├── SwipeCard [0 — 인터랙티브]
        │   ├── CardImage + 하단 그라디언트
        │   ├── CardInfo (가게명 / 직종 / 시급 / 요약)
        │   └── SwipeOverlay (찜! / 관심없음 스탬프)
        ├── SwipeCard [1 — scale 0.95, translateY 12px]
        └── SwipeCard [2 — scale 0.90, translateY 24px]
    └── SwipeControls (관심없음 / 찜 버튼)
    └── DeckEmptyState
  </deck_tree>

  <wishlist_tree>
    WishlistPage
    └── WishlistGrid (2열 격자)
        └── GridCard × N (앞면: 가게명/직종/시급/요약)
    └── FlipCardOverlay (카드 탭 시 확대 + 뒤집힘)
        ├── FrontFace (격자 카드와 동일한 내용)
        └── BackFace (상세 설명 / 주소 / 근무조건 / 리뷰 / 지원하기 버튼)
    └── WishlistEmptyState
  </wishlist_tree>

  <shared>
    Button — variant: primary / secondary / ghost, size: md(44px) / lg(52px)
    IconButton — 44x44px, aria-label 필수
    Input — 라벨 + 에러 슬롯 내장
    Chip — 읽기 전용 태그(직종, 복리후생)
    Badge — 평점 표시
    EmptyState — 아이콘 + 제목 + 설명 + CTA
    Skeleton — card / grid 2종
    Spinner — 16px(버튼 내) / 32px(전체 화면)
    CRITICAL: 위 컴포넌트는 B 단독 소유다. A가 로그인 화면에 필요한 것이 있으면 직접 만들지 말고 B에게 요청한다. 프리미티브가 두 벌 생기면 화면이 어긋나기 시작한다.
  </shared>
</component_hierarchy>

<pages_and_interfaces>
  <global_layout>
    <container>max-width 480px, margin 0 auto, 배경 `#F7F8FA`. 480px 초과 뷰포트에서는 바깥이 `#EDEFF3`. 최소 높이 `100dvh` (iOS 주소창 대응으로 vh 대신 dvh).</container>
    <top_bar>높이 56px, 배경 `#FFFFFF`, 하단 보더 1px `#E5E7EB`, sticky top 0, z-index 30. 중앙에 화면 제목 (17px, 700, `#111827`).</top_bar>
    <bottom_tab_bar>
      높이 64px + `env(safe-area-inset-bottom)`, 배경 `#FFFFFF`, 상단 보더 1px `#E5E7EB`, fixed bottom 0, z-index 30.
      3탭: 홈(Home 아이콘) / 찜(Heart) / 설정(Settings). 아이콘 24px + 라벨 11px(500), 세로 배치 gap 4px.
      비활성 `#9CA3AF`, 활성 `#FF4D6D`. 찜 탭에 개수 배지(16px 원, 배경 `#FF4D6D`, 흰 숫자 10px, 99 초과 시 "99+").
      본문 하단 패딩 `calc(64px + env(safe-area-inset-bottom) + 16px)`.
    </bottom_tab_bar>
    <toast>fixed, bottom `calc(80px + env(safe-area-inset-bottom))`, 좌우 16px. 높이 48px, radius 12px, 14px/500. 3초 자동 소멸, 최대 1개(rough MVP이므로 스택하지 않고 교체한다).</toast>
  </global_layout>

  <login_view>
    <form>
      padding 24px. 로고 "AlbaSwipe" (28px, 800, `#FF4D6D`), 하단 32px 간격.
      Input: 이메일 (type email, autoComplete username) / 비밀번호 (type password, autoComplete current-password)
      Input 높이 52px, radius 12px, 보더 1px `#E5E7EB`, 포커스 시 보더 `#FF4D6D` + ring 3px `rgba(255,77,109,0.15)`. 폰트 16px (CRITICAL: iOS Safari 자동 확대를 막으려면 16px 이상이어야 한다).
      필드 간격 16px. Button primary lg "로그인" (전체 폭, 상단 24px). 제출 중에는 스피너 + disabled.
      하단 "회원가입" 링크 (14px, `#FF4D6D`, 600) → `/signup`
    </form>
    <validation>
      이메일 형식 오류 / 비밀번호 6자 미만은 blur 시 필드 하단 6px에 13px `#EF4444`로 표시.
      로그인 실패는 폼 상단 배너 "이메일 또는 비밀번호가 올바르지 않습니다" (배경 `#FEF2F2`, 텍스트 `#EF4444`, radius 8px, padding 12px).
    </validation>
  </login_view>

  <signup_view>
    <form>
      `login_view`와 같은 레이아웃. 필드: 닉네임(2~10자) / 이메일 / 비밀번호(6자 이상) / 비밀번호 확인.
      비밀번호 확인 불일치는 onChange 즉시 표시한다 (이 필드만 blur를 기다리지 않는다).
      Button primary lg "가입하고 시작하기" → 성공 시 자동 로그인 상태로 `/`(홈)로 이동 + 토스트 "환영해요!".
      하단 "이미 계정이 있으신가요? 로그인" → `/login`
    </form>
    <validation>
      Supabase가 반환하는 "User already registered"는 이메일 필드 하단에 "이미 가입된 이메일입니다"로 번역해 표시한다. CRITICAL: Supabase의 영어 에러 메시지를 그대로 화면에 찍지 않는다.
    </validation>
  </signup_view>

  <home_deck_view>
    이 앱의 심장. 다른 모든 화면보다 먼저 완성한다.
    <card_stack>
      영역: width `calc(100% - 32px)` (최대 448px), aspect-ratio 3 / 4, 상단 마진 16px, 중앙 정렬.
      카드: radius 24px, 배경 `#FFFFFF`, 그림자 `0 8px 24px rgba(17,24,39,0.12)`, overflow hidden, position absolute.
      DOM에 3장만 유지. [0] 인터랙티브, [1] `scale(0.95) translateY(12px)`, [2] `scale(0.90) translateY(24px)`. 뒤 카드는 `pointer-events: none`.
      이미지: 상단 60%, `object-fit: cover`. `image_url`이 null이면 카테고리 기본 그라디언트 + 아이콘 48px `rgba(255,255,255,0.5)`.
      이미지 하단 40%에 `linear-gradient(to top, rgba(17,24,39,0.75), transparent)` 오버레이.
      이미지 위 정보 (padding 16px):
        직종 Chip (배경 `rgba(255,255,255,0.9)`, 텍스트 `#111827`, 11px/600)
        가게명 (22px, 700, `#FFFFFF`, 최대 2줄 말줄임)
      카드 흰 영역 (padding 16px):
        시급 행: "시급" 라벨 (13px, `#4B5563`) + 금액 (24px, 800, `#FF4D6D`, tabular-nums, 예 "12,000원")
        요약 (15px, `#374151`, 최대 2줄 말줄임)
        근무 요일·시간 (13px, `#9CA3AF`, 예 "월·수·금 09:00 ~ 14:00")
    </card_stack>
    <swipe_gesture>
      @use-gesture/react의 `useDrag`로 x 오프셋과 속도를 받는다.
      회전: `rotate = clamp(x / 18, -18deg, 18deg)`, `transform-origin: 50% 120%` (원점이 아래여야 실제 카드처럼 보인다).
      오버레이 스탬프: x &gt; 0이면 우상단 "찜!" (보더 4px `#22C55E`, 텍스트 `#22C55E` 28px/800, -12deg), x &lt; 0이면 좌상단 "관심없음" (`#EF4444`, +12deg). opacity = `clamp(abs(x) / 100, 0, 1)`.
      확정 임계값: `abs(x) &gt; 100px` 또는 `abs(velocityX) &gt; 0.5`.
      날아가기: 목표 x = `sign(x) * (윈도우 폭 + 200px)`, opacity 1 → 0, 320ms, `cubic-bezier(0.22, 1, 0.36, 1)`.
      취소: 스프링 복귀 (stiffness 300, damping 28).
      다음 카드 승격: scale 0.95 → 1, translateY 12 → 0, 260ms ease-out. 앞 카드가 날기 시작하고 60ms 뒤에 시작.
      `touch-action: none`을 카드에 적용해 드래그 중 세로 스크롤을 막는다.
      CRITICAL: 스와이프는 **낙관적으로 즉시 반영**한다. upsert 응답을 기다린 뒤 카드를 날리면 체감이 무너진다. 요청이 실패해도 카드를 되돌리지 말고 토스트로만 알린다 — 이미 다음 카드를 보고 있는데 카드가 되돌아오면 더 혼란스럽다.
      햅틱: `navigator.vibrate(15)` (지원 기기에서만).
    </swipe_gesture>
    <swipe_controls>
      카드 아래 24px, 중앙 정렬, gap 24px.
      관심없음: 64px 원, 배경 `#FFFFFF`, 그림자 `0 4px 12px rgba(17,24,39,0.10)`, 아이콘 X 30px `#EF4444`, aria-label "관심 없음"
      찜: 64px 원, 같은 스타일, 아이콘 Heart(fill) 30px `#22C55E`, aria-label "찜하기"
      누름: scale 0.88 (100ms) 후 복귀. 누르면 드래그와 동일한 날아가기 애니메이션이 재생된다.
    </swipe_controls>
    <keyboard_shortcuts>
      ArrowLeft — 관심 없음 / ArrowRight — 찜
      CRITICAL: `document.activeElement`가 INPUT/TEXTAREA일 때는 동작하지 않는다.
    </keyboard_shortcuts>
    <loading_state>카드 모양 Skeleton 1장 (`#E5E7EB` 배경, `#F3F4F6` shimmer 1.4초 무한) + 컨트롤 버튼 비활성화.</loading_state>
    <empty_state>
      아이콘 SearchX 56px `#9CA3AF`, 제목 "오늘 볼 공고를 다 봤어요!" (18px, 700), 설명 "찜한 공고를 비교해 보세요" (14px, `#4B5563`), Button primary md "찜 목록 보기" → `/wishlist`.
    </empty_state>
    <error_state>아이콘 WifiOff 48px + "공고를 불러오지 못했어요" + Button secondary "다시 시도".</error_state>
  </home_deck_view>

  <wishlist_view>
    찜한 공고를 **한 화면에 4개씩** 놓고 비교하는 것이 이 화면의 존재 이유다. 스크롤보다 비교가 우선이다.
    <header>제목 "찜한 공고" + 개수 (예 "찜한 공고 8").</header>
    <grid>
      2열 격자, padding 16px, gap 12px. 각 셀 aspect-ratio 3 / 4 → 480px 폭 기준 셀 약 214x285px. 한 화면에 정확히 4개(2x2)가 들어온다.
      GridCard 앞면: radius 16px, 배경 `#FFFFFF`, 보더 1px `#F3F4F6`, overflow hidden.
        상단 45%: 이미지 (없으면 카테고리 그라디언트). 우상단에 찜해제 IconButton (X 16px, 배경 `rgba(17,24,39,0.5)`, 28px 원)
        하단 (padding 12px):
          가게명 (14px, 700, `#111827`, 1줄 말줄임)
          직종 Chip (높이 22px, 배경 `#F3F4F6`, 텍스트 11px `#4B5563`)
          시급 (18px, 800, `#FF4D6D`, tabular-nums)
          요약 (12px, `#9CA3AF`, 2줄 말줄임)
      CRITICAL: 앞면에 보이는 4개 정보(가게명·직종·시급·요약)가 비교의 전부다. 여기에 정보를 더 넣으면 4분할의 의미가 사라진다.
      4개를 넘으면 세로 스크롤. 페이지네이션은 없다.
    </grid>
    <flip_interaction>
      격자 카드를 탭하면 그 카드가 화면 중앙으로 확대되며 뒤집힌다.
      1. 백드롭 `rgba(17,24,39,0.45)` 페이드 인 (200ms)
      2. motion의 `layoutId`(값: `card-${job.id}`)로 격자 셀 → 확대 카드로 전환. 목표 크기 `calc(100% - 48px)` × `min(70dvh, 520px)`, 중앙 정렬
      3. 동시에 `rotateY: 0 → 180deg`, 520ms, `cubic-bezier(0.22, 1, 0.36, 1)`. 컨테이너에 `perspective: 1200px`, 양면에 `backface-visibility: hidden`, 뒷면에 `rotateY(180deg)` 초기값
      4. 닫기: 백드롭 탭, 우상단 X 버튼, Escape 키. 역방향 애니메이션으로 격자 셀 자리로 되돌아간다
      CRITICAL: 확대와 뒤집기를 동시에 하되, layout 애니메이션이 꼬이면 **확대만 하고 뒤집기를 포기한다.** 데모에서 카드가 깨져 보이는 것보다 단순히 확대되는 게 훨씬 낫다. 이 폴백 판단은 CP4(+5:30)에 내린다.
    </flip_interaction>
    <back_face>
      확대된 카드의 뒷면. 내부 스크롤 가능, padding 20px.
      우상단 닫기 IconButton (X 20px, `#9CA3AF`)
      가게명 (20px, 700, `#111827`)
      평점 행: Star 아이콘 16px `#F59E0B` + 평점 (15px, 700) + "리뷰 N개" (13px, `#9CA3AF`)
      시급 (24px, 800, `#FF4D6D`)
      구분선 1px `#F3F4F6`
      "근무 조건" 소제목 (14px, 700) — 요일 / 시간 / 복리후생 Chip들 (배경 `#F0FDF4`, 텍스트 `#16A34A`, 12px)
      "가게 주소" 소제목 — address (14px, `#374151`)
      "상세 내용" 소제목 — description (14px, line-height 1.7, `#374151`, `white-space: pre-wrap`). CRITICAL: `dangerouslySetInnerHTML`을 쓰지 않는다
      "리뷰" 소제목 — 리뷰 카드 2~3개. 각각: 작성자명(13px, 600) + 별점(12px `#F59E0B`) + 내용(13px, `#4B5563`, 3줄 말줄임), 배경 `#F7F8FA`, radius 8px, padding 10px
      하단 고정: Button primary lg "지원하기" (전체 폭) → `/apply/:jobId`
    </back_face>
    <unwishlist_behavior>
      격자 카드 우상단 X를 누르면 즉시 격자에서 제거하고(낙관적) 토스트 "찜을 해제했어요".
      서버에서는 `swipes.direction`을 `'right'` → `'left'`로 UPDATE한다.
      CRITICAL: 행을 DELETE하지 않는다. 삭제하면 그 공고가 홈 덱에 다시 나타나는데, 사용자가 방금 "관심 없음"으로 치운 것이 다시 튀어나오는 셈이라 버그로 보인다.
    </unwishlist_behavior>
    <loading_state>격자 모양 Skeleton 4개 (2x2).</loading_state>
    <empty_state>
      아이콘 Heart 56px `#E5E7EB`, 제목 "아직 찜한 공고가 없어요" (18px, 700), 설명 "마음에 드는 공고는 오른쪽으로 넘겨보세요" (14px, `#4B5563`), Button primary md "공고 보러 가기" → `/`.
    </empty_state>
  </wishlist_view>

  <apply_view>
    <header>높이 56px, 좌측 뒤로가기 IconButton, 중앙 "지원하기".</header>
    <job_summary>
      배경 `#FFFFFF`, radius 16px, margin 16px, padding 16px, 가로 배치.
      좌측 썸네일 64x64px radius 12px + 우측(가게명 15px/700, 직종·시급 13px `#4B5563`).
    </job_summary>
    <form>
      padding 0 16px. 라벨 "사장님께 한마디" (14px, 600) + Textarea (최소 높이 140px, 최대 300자, radius 12px, 보더 1px `#E5E7EB`, 폰트 16px, placeholder "간단한 자기소개나 지원 동기를 적어주세요").
      우측 하단에 글자수 카운터 `0 / 300` (12px, `#9CA3AF`).
      안내 문구: "닉네임과 함께 전달됩니다" (12px, `#9CA3AF`).
    </form>
    <submit>
      하단 sticky, 배경 `#FFFFFF`, 상단 보더 1px `#E5E7EB`, padding 12px 16px + safe-area.
      Button primary lg "지원서 보내기" (전체 폭).
      동작은 Q2의 결정을 따른다.
      - **Q2 = 버튼만 (기본값)**: 제출 시 저장하지 않고 토스트 "지원이 완료됐어요!" + 800ms 뒤 `/wishlist`로 이동. CRITICAL: 이 경우에도 절대 에러를 내지 않는다. 데모에서 버튼을 눌렀을 때 아무 일도 안 일어나거나 에러가 뜨면 그 순간 끝난다
      - **Q2 = 실제 저장**: `applications` 테이블에 upsert 후 같은 토스트와 이동. 중복 지원은 UNIQUE 제약으로 조용히 무시하고 성공으로 처리한다
    </submit>
  </apply_view>

  <settings_view>
    <profile_card>
      배경 `#FFFFFF`, radius 16px, margin 16px, padding 20px.
      Avatar 56px (닉네임 첫 글자 이니셜, 배경 `#F3F4F6`, 텍스트 `#4B5563` 22px) + 닉네임 (18px, 700) + 이메일 (13px, `#9CA3AF`).
      하단 통계 2분할: 찜 N개 / 본 공고 N개 (숫자 20px/700 `#111827`, 라벨 12px `#9CA3AF`, 사이 1px 구분선).
    </profile_card>
    <menu_list>
      배경 `#FFFFFF`, radius 16px, margin 16px. 행 높이 52px, padding 좌우 16px, 행 사이 1px `#F3F4F6`.
      각 행: 좌측 아이콘 20px + 라벨 15px, 우측 ChevronRight 18px `#9CA3AF`.
      항목:
      1. "스와이프 기록 초기화" (아이콘 RotateCcw) → ConfirmDialog "모든 스와이프 기록이 지워지고 공고를 처음부터 다시 볼 수 있어요" (취소 / 초기화) → `swipes`에서 내 행 전체 삭제 → 토스트 "초기화했어요" + 홈 덱과 찜 목록 캐시 무효화
         CRITICAL: 이 기능은 데모 리허설의 생명줄이다. 이게 없으면 리허설을 한 번 돌릴 때마다 새 계정을 만들어야 한다. **가장 먼저 만들 설정 항목이다.**
      2. "로그아웃" (아이콘 LogOut, 텍스트 `#EF4444`) → ConfirmDialog → signOut + 캐시 clear + `/login`
    </menu_list>
    <app_version>하단 중앙에 "AlbaSwipe v0.1.0" (12px, `#9CA3AF`).</app_version>
  </settings_view>

  <keyboard_shortcuts_reference>
    홈 덱: ArrowLeft(관심 없음) / ArrowRight(찜)
    전역: Escape(열린 확대 카드 또는 다이얼로그 닫기)
    CRITICAL: 모든 단축키는 포커스가 입력 요소에 없을 때만 동작한다. 이 검사를 `useKeyboard` 훅 한 곳에 넣는다.
  </keyboard_shortcuts_reference>
</pages_and_interfaces>

<api_endpoints>
  <note>REST 엔드포인트를 직접 만들지 않는다. 아래는 프론트엔드가 호출하는 **supabase-js 쿼리 목록**이며, 이것이 A와 B 사이의 실질적 API 계약이다. 모든 함수는 `src/lib/api/`에 있고 B는 훅을 통해서만 접근한다.</note>

  <query name="fetchDeckJobs">
    <purpose>아직 스와이프하지 않은 공고 목록 (홈 덱)</purpose>
    <file>src/lib/api/jobs.ts</file>
    <implementation>
      1. `supabase.from('swipes').select('job_id')` → 내 스와이프 job_id 배열 (RLS가 내 것만 반환)
      2. `supabase.from('jobs').select('*').not('id','in',`(${ids.join(',')})`).limit(20)`
      CRITICAL: 스와이프가 0건이면 `.not('id','in','()')`가 SQL 문법 오류를 낸다. 배열이 비었으면 `.not()` 자체를 붙이지 않는 분기를 반드시 둔다. **이건 실제로 터지는 버그이고, 신규 가입 직후 첫 화면에서 터진다.**
      정렬은 하지 않는다(추천 알고리즘 범위 밖). 시드 순서 그대로 나온다.
    </implementation>
    <returns>Job[]</returns>
    <errors>네트워크 실패 시 throw → 훅에서 error 상태 → 덱 에러 화면</errors>
  </query>

  <query name="createSwipe">
    <purpose>스와이프 기록. 오른쪽이면 그대로 찜이 된다.</purpose>
    <file>src/lib/api/swipes.ts</file>
    <implementation>
      `supabase.from('swipes').upsert({ job_id, direction }, { onConflict: 'user_id,job_id' })`
      CRITICAL: `insert`가 아니라 `upsert`여야 한다. UNIQUE 제약 때문에 재시도나 중복 탭에서 즉시 에러가 난다.
      `user_id`는 컬럼 default가 `auth.uid()`이므로 클라이언트가 보내지 않는다.
    </implementation>
    <returns>void</returns>
    <errors>실패해도 UI를 되돌리지 않는다. 토스트만 띄운다.</errors>
  </query>

  <query name="fetchWishlist">
    <purpose>찜 목록 (오른쪽 스와이프한 공고)</purpose>
    <file>src/lib/api/swipes.ts</file>
    <implementation>
      `supabase.from('swipes').select('job_id, created_at, jobs(*)').eq('direction','right').order('created_at',{ascending:false})`
      중첩 select로 조인한다. 별도 쿼리 2번을 날리지 않는다.
    </implementation>
    <returns>Array&lt;{ job: Job; createdAt: string }&gt;</returns>
  </query>

  <query name="unwishlist">
    <purpose>찜 해제</purpose>
    <file>src/lib/api/swipes.ts</file>
    <implementation>
      `supabase.from('swipes').update({ direction: 'left' }).eq('job_id', jobId)`
      CRITICAL: `delete`가 아니라 `update`다. 이유는 `<core_data_entities>`의 swipes 설명 참조.
    </implementation>
    <returns>void</returns>
  </query>

  <query name="fetchReviews">
    <purpose>공고별 리뷰 (카드 뒷면)</purpose>
    <file>src/lib/api/jobs.ts</file>
    <implementation>`supabase.from('job_reviews').select('*').eq('job_id', jobId).order('created_at',{ascending:false}).limit(3)`</implementation>
    <returns>Review[]</returns>
  </query>

  <query name="resetSwipes">
    <purpose>스와이프 기록 전체 삭제 (설정 화면). 데모 리허설용.</purpose>
    <file>src/lib/api/swipes.ts</file>
    <implementation>
      `supabase.from('swipes').delete().eq('user_id', user.id)`
      RLS가 내 행만 지우도록 보장하지만, 명시적으로 `eq('user_id')`를 붙인다. Supabase는 조건 없는 delete를 거부한다.
    </implementation>
    <returns>void</returns>
  </query>

  <query name="createApplication">
    <purpose>지원 저장. Q2가 "실제 저장"으로 결정될 때만 구현한다.</purpose>
    <file>src/lib/api/applications.ts (Q2 결정 시 생성)</file>
    <implementation>`supabase.from('applications').upsert({ job_id, message }, { onConflict: 'user_id,job_id' })`</implementation>
    <returns>void</returns>
  </query>

  <react_query_keys>
    CRITICAL: queryKey는 아래 3개만 쓴다. 더 늘리지 않는다.
    - `['jobs']` — 덱. staleTime 0. `createSwipe` 성공 후 무효화하지 않는다(낙관적으로 로컬에서 카드를 제거하므로 재요청이 불필요하고, 재요청하면 화면이 깜빡인다)
    - `['swipes']` — 찜 목록. `createSwipe`와 `unwishlist` 성공 후 무효화
    - `['reviews', jobId]` — 리뷰. staleTime Infinity (세션 내 불변)
  </react_query_keys>

  <error_handling_note>
    supabase-js는 throw하지 않고 `{ data, error }`를 반환한다. CRITICAL: 모든 호출에서 `if (error) throw error`를 반드시 쓴다. 이걸 빠뜨리면 실패가 조용히 무시되고 빈 화면만 나온다 — 디버깅에 가장 오래 걸리는 유형의 버그다.
  </error_handling_note>
</api_endpoints>

<core_functionality>
  <auth>
    - 이메일/비밀번호 회원가입 (닉네임 포함), 로그인, 로그아웃
    - 새로고침 후 세션 유지 (supabase-js 자동 처리)
    - 로그인 여부에 따른 라우트 가드
  </auth>
  <swipe_discovery>
    - 아직 보지 않은 공고만 덱에 노출
    - 드래그 / 버튼 / 키보드 3가지 입력
    - 낙관적 업데이트 (응답을 기다리지 않음)
    - 오버레이 스탬프 + 회전 + 날아가기 애니메이션
    - 덱 소진 시 빈 상태
  </swipe_discovery>
  <wishlist_compare>
    - 오른쪽 스와이프 = 자동 찜
    - 2x2 격자로 4개 동시 비교 (가게명 · 직종 · 시급 · 요약)
    - 카드 탭 → 확대 + 뒤집기 → 상세 정보 (상세 설명 · 주소 · 근무조건 · 복리후생 · 리뷰)
    - 찜 해제 (덱에 다시 나타나지 않음)
  </wishlist_compare>
  <apply>
    - 카드 뒷면에서 지원 화면 진입
    - 공고 요약 + 메시지 입력 + 제출 버튼
    - 실제 저장 여부는 Q2에서 결정
  </apply>
  <settings>
    - 닉네임 · 이메일 · 찜 수 · 본 공고 수 표시
    - 스와이프 기록 초기화 (데모 리허설용)
    - 로그아웃
  </settings>
</core_functionality>

<error_handling>
  <user_facing>
    <toast>
      - 성공: 배경 `#F0FDF4`, 텍스트 `#16A34A`, 3초
      - 에러: 배경 `#FEF2F2`, 텍스트 `#EF4444`, 3초
      - 최대 1개. 새 토스트는 기존 것을 교체한다 (rough MVP에서 스택 관리는 과하다)
    </toast>
    <form_validation>
      인라인 에러: 필드 하단 6px, 13px, `#EF4444`. 필드 보더도 `#EF4444`.
      표시 시점은 blur. 비밀번호 확인 불일치만 onChange 즉시.
      Supabase의 영어 에러 메시지는 `AUTH_ERROR_MESSAGES` 맵으로 한국어 변환해 노출한다. CRITICAL: 원문을 그대로 화면에 찍지 않는다.
    </form_validation>
    <error_states>
      화면별 에러 상태는 `<pages_and_interfaces>`에 정의돼 있다. 공통 규칙: **절대 흰 화면을 보여주지 않는다.** 로딩이면 스켈레톤, 실패면 아이콘 + 문구 + 다시 시도 버튼.
    </error_states>
  </user_facing>
  <error_boundary>
    루트에 ErrorBoundary 1개 + 홈 덱에 1개.
    덱에 따로 두는 이유: 카드 렌더 오류가 앱 전체를 흰 화면으로 만들면 데모가 끝난다. 덱만 폴백으로 바꾸고 탭바는 살려 둔다.
    폴백: AlertTriangle 56px `#EF4444` + "문제가 발생했어요" + Button primary "새로고침".
  </error_boundary>
  <network>
    - react-query 기본 재시도 1회
    - 스와이프 실패: 카드를 되돌리지 않고 토스트만. 사용자는 계속 스와이프할 수 있다
    - 오프라인 감지는 하지 않는다 (범위 밖)
  </network>
</error_handling>

<aesthetic_guidelines>
  <design_fusion>
    "데이팅 앱의 즐거움 + 구인 앱의 신뢰감". 카드와 제스처는 틴더에서, 정보 밀도와 타이포그래피는 토스/당근마켓에서 가져온다.
    원칙 3가지:
    1. 카드가 주인공이다. 홈 화면에서 카드 외의 모든 요소는 시각적으로 물러난다.
    2. 숫자는 크게, 나머지는 작게. 시급이 화면에서 가장 눈에 띄는 텍스트여야 한다.
    3. 찜 격자는 비교가 목적이다. 4개 카드가 **같은 자리에 같은 크기로** 같은 4개 정보를 보여줘야 눈이 비교할 수 있다.
  </design_fusion>

  <color_palette>
    <brand>
      - Coral 500: `#FF4D6D` - 주 CTA, 활성 탭, 시급 금액, 로고
      - Coral 600: `#E03356` - 버튼 눌림
      - Coral 50: `#FFF0F3` - 선택 상태 배경
    </brand>
    <backgrounds>
      - App Background: `#F7F8FA`
      - Surface: `#FFFFFF` - 카드, 탑바, 탭바
      - Surface Subtle: `#F3F4F6` - 비활성 칩, 플레이스홀더
      - Outside Container: `#EDEFF3` - 480px 바깥 데스크톱 여백
    </backgrounds>
    <text>
      - Text Primary: `#111827` - 제목, 값
      - Text Body: `#374151` - 본문
      - Text Secondary: `#4B5563` - 부제, 라벨
      - Text Tertiary: `#9CA3AF` - 메타 정보, 비활성
      - Text Inverse: `#FFFFFF`
    </text>
    <borders>
      - Border Default: `#E5E7EB` - 입력, 구분선
      - Border Subtle: `#F3F4F6` - 카드 보더, 리스트 구분선
    </borders>
    <status>
      - Success / 찜: `#22C55E` (진한 텍스트 `#16A34A`, 배경 `#F0FDF4`)
      - Error / 관심없음: `#EF4444` (배경 `#FEF2F2`)
      - Rating: `#F59E0B` - 별점 아이콘
    </status>
    <overlays>
      - Card Image Gradient: `linear-gradient(to top, rgba(17,24,39,0.75), transparent)`
      - Backdrop: `rgba(17,24,39,0.45)`
      - Chip on Image: `rgba(255,255,255,0.9)`
      - Grid Card Close Button: `rgba(17,24,39,0.5)`
      - Input Focus Ring: `rgba(255,77,109,0.15)`
      - Card Shadow: `rgba(17,24,39,0.12)` / Control Shadow: `rgba(17,24,39,0.10)`
      - Placeholder Icon on Image: `rgba(255,255,255,0.5)`
    </overlays>
    <dark_theme>범위 밖. 모든 색을 `@theme` CSS 변수로 정의하므로 나중에 변수 값만 바꾸면 된다. 컴포넌트에 hex를 직접 쓰지 않는다.</dark_theme>
  </color_palette>

  <typography>
    <font_families>
      `Pretendard Variable, Pretendard, -apple-system, BlinkMacSystemFont, system-ui, 'Apple SD Gothic Neo', sans-serif`
      CDN: `cdn.jsdelivr.net/gh/orioncactus/pretendard`, `font-display: swap`
      시급·통계 숫자에는 `font-variant-numeric: tabular-nums` (숫자 폭이 흔들리면 카드가 떨려 보인다)
    </font_families>
    <font_sizes>
      - 로고: 28px / 800 / 1.2
      - 화면 제목: 17px / 700 / 1.4
      - 카드 가게명(덱): 22px / 700 / 1.35
      - 격자 가게명: 14px / 700 / 1.4
      - 뒷면 가게명: 20px / 700 / 1.4
      - 본문: 14px / 400 / 1.55
      - 상세 설명: 14px / 400 / 1.7
      - 라벨·버튼: 14px / 600 / 1.4
      - 캡션: 13px / 400 / 1.45
      - 마이크로(칩, 탭 라벨): 11~12px / 500 / 1.3
      - 시급(덱): 24px / 800 / tabular-nums
      - 시급(뒷면): 24px / 800 / tabular-nums
      - 시급(격자): 18px / 800 / tabular-nums
      - 입력 필드: 16px (CRITICAL: iOS Safari 자동 확대 방지 하한)
    </font_sizes>
    <korean_specific>
      `word-break: keep-all`을 전역 적용한다. 한글은 단어 중간에서 잘리면 가독성이 급락한다.
      이탤릭을 쓰지 않는다. 강조는 굵기와 색으로만.
      말줄임: 1줄은 `text-overflow: ellipsis`, 2줄 이상은 `-webkit-line-clamp`.
    </korean_specific>
  </typography>

  <spacing>
    기본 단위 4px. 스케일 4 / 8 / 12 / 16 / 20 / 24 / 32 / 48
    화면 좌우 여백 16px · 카드 내부 padding 16px(격자 카드 12px) · 격자 gap 12px · 폼 필드 간격 16px · 아이콘-텍스트 간격 6px
  </spacing>

  <borders_and_shadows>
    radius: 버튼/입력 12px · 격자 카드 16px · 스와이프 카드 24px · 칩 full · 아바타 full
    shadow-card (스와이프 카드): `0 8px 24px rgba(17,24,39,0.12)`
    shadow-control (원형 버튼): `0 4px 12px rgba(17,24,39,0.10)`
    격자 카드에는 그림자를 쓰지 않는다. 보더만으로 구분한다 — 4개가 나란히 있을 때 그림자가 겹치면 지저분해진다.
  </borders_and_shadows>

  <component_styling>
    <buttons>
      - primary: 배경 `#FF4D6D`, 텍스트 `#FFFFFF`, radius 12px, 14px/600
      - secondary: 배경 `#FFFFFF`, 보더 1.5px `#FF4D6D`, 텍스트 `#FF4D6D`
      - ghost: 투명 배경, 텍스트 `#4B5563`
      - 크기: md 44px / lg 52px
      - disabled: 배경 `#E5E7EB`, 텍스트 `#9CA3AF`
      - pressed: `scale(0.97)`, 100ms
      - loading: 텍스트 유지 + 좌측 16px 스피너, 버튼 폭 고정(레이아웃 점프 방지)
      - CRITICAL: 모든 버튼의 최소 터치 영역 44x44px
    </buttons>
    <inputs>
      높이 52px, radius 12px, 보더 1px `#E5E7EB`, padding 좌우 16px, 폰트 16px
      placeholder `#9CA3AF` · focus 보더 `#FF4D6D` + ring 3px `rgba(255,77,109,0.15)` · error 보더 `#EF4444`
      Textarea: 최소 140px, resize vertical, padding 12px 16px
    </inputs>
    <chips>
      높이 22~26px, radius full, padding 좌우 10px, 11~12px/500
      직종(격자/덱): 배경 `#F3F4F6`, 텍스트 `#4B5563`
      복리후생(뒷면): 배경 `#F0FDF4`, 텍스트 `#16A34A`
    </chips>
    <skeletons>배경 `#E5E7EB`, `#F3F4F6` shimmer 1.4초 무한. `prefers-reduced-motion`이면 정적.</skeletons>
  </component_styling>

  <animations>
    <micro>
      버튼 누름 scale 0.97 / 100ms · 격자 카드 탭 scale 0.985 / 120ms · 탭바 아이콘 scale 1→1.15→1 / 180ms
    </micro>
    <swipe>
      드래그 추종: 애니메이션 없이 즉시. 회전 `clamp(x/18, ±18)deg`, 원점 `50% 120%`
      날아가기: 320ms, `cubic-bezier(0.22, 1, 0.36, 1)`, opacity → 0
      취소 복귀: spring(stiffness 300, damping 28)
      다음 카드 승격: 260ms ease-out, 60ms 지연
      스탬프 opacity: 드래그 거리에 비례, 별도 전환 없음(지연되면 반응이 둔해 보인다)
    </swipe>
    <flip>
      확대: motion `layoutId`, 520ms, `cubic-bezier(0.22, 1, 0.36, 1)`
      뒤집기: `rotateY 0 → 180deg`, 같은 duration·easing으로 동시 실행
      컨테이너 `perspective: 1200px`, 양면 `backface-visibility: hidden`
      백드롭 페이드 200ms
      닫기는 역방향 동일 시간
    </flip>
    <page_transitions>탭 전환에 애니메이션을 넣지 않는다. 빈번한 이동이라 애니메이션이 오히려 느리게 느껴진다.</page_transitions>
    <loading>스켈레톤 shimmer 1.4초 · 버튼 스피너 16px 2px stroke 700ms 회전</loading>
  </animations>

  <responsive_design>
    <breakpoints>
      - 0–479px: 컨테이너가 뷰포트 전체 폭 (기준 레이아웃)
      - 480px+: 컨테이너 480px 고정, 좌우 `#EDEFF3` 여백
      CRITICAL: 데스크톱 전용 레이아웃을 만들지 않는다. 7시간을 반응형에 쓰는 것보다 덱과 뒤집기 완성도에 쓰는 것이 낫다. 심사위원은 대부분 휴대폰으로 본다.
    </breakpoints>
    <touch>
      - 스와이프 카드: 좌우 드래그, `touch-action: none`, 임계값 100px 또는 속도 0.5
      - 격자 카드: 탭 → 확대+뒤집기
      - 최소 터치 타겟 44x44px
      - `100vh` 대신 `100dvh`
      - 탭바와 하단 고정 버튼에 `env(safe-area-inset-bottom)` 반영
      - CRITICAL: 홈 화면은 `overflow: hidden`으로 고정해 카드 위에서 세로 스크롤이 일어나지 않게 한다
    </touch>
  </responsive_design>

  <icons>
    lucide-react 1.45.0. 기본 20px, stroke 1.75. 탭바 24px, 인라인 메타 14~16px, 빈 상태 56px.
    사용: Home, Heart, Settings, X, Star, MapPin, Clock, SearchX, WifiOff, AlertTriangle, RotateCcw, LogOut, ChevronRight, ChevronLeft, Send
  </icons>

  <accessibility>
    <target>WCAG 2.1 AA 중 7시간 안에 현실적으로 지킬 수 있는 범위</target>
    <contrast>
      본문 `#111827`/`#374151`/`#4B5563`은 흰 배경에서 4.5:1 이상 통과.
      `#9CA3AF`는 흰 배경에서 2.8:1로 기준 미달이므로 **12px 이하 메타 정보에만** 쓰고 의미 전달에 필수적인 텍스트에는 쓰지 않는다.
      `#FF4D6D` 위 흰 텍스트는 3.4:1 — 14px/600 이상에서만 사용한다(버튼 라벨은 모두 충족).
      CRITICAL: 시급을 `#FF4D6D`로 흰 배경 위에 쓸 때는 18px 이상 800 굵기를 유지한다(대형 텍스트 3:1 기준).
    </contrast>
    <keyboard>
      모든 인터랙티브 요소가 Tab 도달 가능, DOM 순서 = 시각 순서.
      포커스 링 `outline: 2px solid #FF4D6D; outline-offset: 2px`. 제거하지 않는다.
      스와이프 덱을 키보드만으로 조작할 수 있다 — 제스처 전용 기능을 만들지 않는 것이 이 앱의 접근성 핵심이다.
      확대된 카드: Escape로 닫기, 닫은 뒤 원래 격자 셀로 포커스 복귀.
    </keyboard>
    <screen_readers>
      아이콘 전용 버튼 전부 `aria-label` (찜 "찜하기", 관심없음 "관심 없음", 찜해제 "찜 해제", 닫기 "닫기")
      스와이프 카드 `role="article"` + `aria-label`에 "가게명, 직종, 시급 N원"
      스와이프 결과를 `aria-live="polite"` 영역에 "찜했습니다" / "관심 없음으로 표시했습니다"로 알린다
      토스트 `role="status"`
      공고 이미지 `alt="{가게명} 사진"`
    </screen_readers>
    <motion>
      `prefers-reduced-motion: reduce`일 때: 카드 날아가기 → 150ms 페이드아웃, 뒤집기 → 회전 없이 즉시 전환, 스켈레톤 shimmer 정지. 기능은 전부 그대로 동작한다.
    </motion>
  </accessibility>
</aesthetic_guidelines>

<security_considerations>
  <rls_is_the_only_boundary>
    CRITICAL: 백엔드 서버가 없으므로 **Row Level Security가 유일한 보안 경계**다. anon key는 브라우저 번들에 그대로 들어가고 누구나 읽을 수 있다. RLS가 없는 테이블은 전 세계에 공개된 테이블이다.
    `schema.sql` 마지막에 세 테이블 모두 `alter table ... enable row level security;`가 있는지 눈으로 확인한다. Supabase 대시보드 Table Editor에서 각 테이블에 방패 아이콘이 켜져 있는지도 확인한다.
  </rls_is_the_only_boundary>
  <policies>
    jobs (공개 읽기 전용):
    - `enable row level security`
    - SELECT: `using (true)` — 모두 읽기 허용
    - INSERT / UPDATE / DELETE 정책을 **만들지 않는다.** 정책이 없으면 거부가 기본값이므로 앱에서도 시드에서도 쓰기가 막힌다. 시드는 SQL Editor(service_role)로 넣으므로 RLS를 우회한다

    job_reviews (공개 읽기 전용): jobs와 동일

    swipes (본인 것만):
    - SELECT: `using (auth.uid() = user_id)`
    - INSERT: `with check (auth.uid() = user_id)`
    - UPDATE: `using (auth.uid() = user_id) with check (auth.uid() = user_id)`
    - DELETE: `using (auth.uid() = user_id)`
    - `user_id` 컬럼 default를 `auth.uid()`로 두어 클라이언트가 user_id를 보내지 않게 한다

    applications (Q2로 만들 경우): swipes와 동일한 4개 정책
  </policies>
  <keys>
    - CRITICAL: `VITE_SUPABASE_ANON_KEY`에 service_role 키를 넣으면 RLS가 전부 무시되어 모든 사용자의 데이터가 공개된다. 반드시 anon 키인지 확인한다 — Supabase 대시보드에서 두 키가 나란히 있어 복사 실수가 잦다
    - `.env.local`을 `.gitignore`에 넣는다. 해커톤에서 시크릿이 새는 가장 흔한 경로다
    - service_role 키는 어디에도 쓰지 않는다. 시드는 대시보드 SQL Editor에서 직접 실행한다
  </keys>
  <client>
    - CRITICAL: `dangerouslySetInnerHTML`을 어디에도 쓰지 않는다. 공고 설명과 리뷰는 전부 `white-space: pre-wrap` 플레인 텍스트로만 렌더한다. 이 규칙 하나로 XSS 표면이 거의 사라진다
    - 지원 메시지는 300자로 제한한다 (Textarea `maxLength` + 제출 전 길이 검사)
    - 외부 링크는 `rel="noopener noreferrer"`
  </client>
  <not_doing>
    rate limiting, CSRF 토큰, CSP 헤더, 감사 로그는 하지 않는다. Supabase 기본 제공 수준으로 충분하고, 7시간 안에서 이것들은 데모 가치를 만들지 않는다. 실서비스 전환 시 다시 본다.
  </not_doing>
</security_considerations>

<final_integration_test>
  <note>자동화 테스트는 작성하지 않는다. 아래 5개 시나리오를 발표 전에 손으로 한 번씩 돌린다. 시나리오 1과 2는 **반드시 실제 휴대폰**으로 확인한다 — 데스크톱 브라우저의 터치 에뮬레이션은 실제 제스처와 다르게 동작한다.</note>

  <test_scenario_1>
    <description>핵심 경로: 가입 → 스와이프 → 찜 → 뒤집기 → 지원</description>
    <steps>
      1. `/signup`에서 닉네임·이메일·비밀번호를 입력하고 가입한다 → 자동 로그인되어 홈(`/`)으로 이동하고 토스트 "환영해요!"가 뜬다
      2. 홈에 공고 카드가 최소 1장 렌더된다 (신규 계정이라 스와이프 이력이 0건인 상태 — `fetchDeckJobs`의 빈 배열 분기가 여기서 검증된다)
      3. 첫 카드를 왼쪽으로 100px 이상 드래그해 놓는다 → "관심없음" 스탬프가 보이고 카드가 왼쪽으로 날아가며 다음 카드가 앞으로 승격된다
      4. 두 번째 카드를 오른쪽으로 드래그한다 → "찜!" 스탬프가 뜨고 하단 찜 탭 배지가 1이 된다
      5. 같은 방식으로 3개를 더 찜해 총 4개를 만든다
      6. 찜 탭으로 이동한다 → 2x2 격자에 4개가 **한 화면 안에** 모두 보이고, 각 카드에 가게명·직종·시급·요약 4개 정보가 있다
      7. 첫 번째 카드를 탭한다 → 카드가 중앙으로 확대되며 뒤집히고 뒷면이 보인다
      8. 뒷면에 상세 설명·가게 주소·근무 조건·복리후생 칩·리뷰 2~3개가 모두 있는지 확인한다
      9. "지원하기"를 누른다 → `/apply/:jobId`로 이동하고 상단에 그 공고의 가게명·직종·시급이 보인다
      10. 메시지를 입력하고 "지원서 보내기"를 누른다 → 토스트 "지원이 완료됐어요!" 후 찜 목록으로 돌아온다 (에러가 절대 나지 않아야 한다)
      11. 홈으로 돌아간다 → 이미 스와이프한 공고들이 덱에 다시 나타나지 않는다
      12. 브라우저를 새로고침한다 → 로그인 화면이 깜빡이지 않고 홈이 바로 뜨며, 찜 배지가 4를 유지한다
    </steps>
  </test_scenario_1>

  <test_scenario_2>
    <description>찜 해제와 덱 제외 규칙</description>
    <steps>
      1. 찜이 4개 이상인 상태로 찜 탭에 진입한다
      2. 첫 번째 격자 카드 우상단의 X를 누른다 → 카드가 즉시 격자에서 사라지고 토스트 "찜을 해제했어요"가 뜬다
      3. 찜 탭 배지가 1 줄어든다
      4. 홈으로 이동한다 → **방금 찜 해제한 공고가 덱에 다시 나타나지 않는다** (direction을 'left'로 UPDATE했기 때문. DELETE로 잘못 구현하면 여기서 다시 나타난다)
      5. 찜 탭으로 돌아가 새로고침한다 → 해제된 카드가 여전히 없다
      6. 남은 찜을 모두 해제한다 → 빈 상태 "아직 찜한 공고가 없어요" + "공고 보러 가기" 버튼이 표시된다
      7. "공고 보러 가기"를 눌러 홈으로 이동한다
    </steps>
  </test_scenario_2>

  <test_scenario_3>
    <description>덱 소진과 기록 초기화 (데모 리허설 경로)</description>
    <steps>
      1. 홈에서 남은 카드를 전부 스와이프한다 (시드 30개 기준)
      2. 덱이 비면 "오늘 볼 공고를 다 봤어요!" + "찜 목록 보기" 버튼이 표시된다
      3. 설정 탭으로 이동한다 → 닉네임·이메일과 함께 찜 N개 / 본 공고 30개가 표시된다
      4. "스와이프 기록 초기화"를 누른다 → 확인 다이얼로그가 뜬다
      5. "초기화"를 누른다 → 토스트 "초기화했어요"
      6. 홈으로 이동한다 → 공고 30개가 처음부터 다시 나타난다
      7. 찜 탭으로 이동한다 → 찜 목록이 비어 있다
      8. 이 경로가 발표 리허설마다 사용된다. **CP3 시점에 반드시 동작해야 한다**
    </steps>
  </test_scenario_3>

  <test_scenario_4>
    <description>인증 가드와 세션</description>
    <steps>
      1. 로그아웃 상태에서 주소창에 `/wishlist`를 직접 입력한다 → `/login`으로 이동한다
      2. 로그인한다 → 홈으로 이동한다
      3. 로그인 상태에서 `/login`을 직접 입력한다 → 홈으로 리다이렉트된다
      4. 새로고침한다 → 전체 화면 스피너가 잠깐 보인 뒤 홈이 뜬다. **로그인 화면이 깜빡 보였다가 홈으로 튀면 실패다** (세션 복구 중 isLoading 처리 누락)
      5. 설정에서 로그아웃한다 → `/login`으로 이동한다
      6. 브라우저 뒤로가기를 누른다 → 홈으로 돌아가지 못하고 로그인 화면에 머문다
      7. 다른 계정으로 로그인한다 → 이전 계정의 찜 목록이 보이지 않는다 (RLS + 캐시 clear 검증)
    </steps>
  </test_scenario_4>

  <test_scenario_5>
    <description>접근성과 입력 대안</description>
    <steps>
      1. 홈에서 마우스/터치 없이 ArrowLeft를 누른다 → 카드가 왼쪽으로 날아간다
      2. ArrowRight를 누른다 → 찜 처리되고 배지가 늘어난다
      3. 하단 컨트롤 버튼(관심없음/찜)을 눌러본다 → 드래그와 동일한 애니메이션으로 동작한다
      4. Tab으로 하단 탭바까지 이동한다 → 모든 요소에 포커스 링이 보이고 순서가 시각 순서와 일치한다
      5. 찜 목록에서 카드를 열고 Escape를 누른다 → 카드가 닫히고 원래 격자 자리로 돌아간다
      6. OS 설정에서 "동작 줄이기"를 켜고 홈으로 돌아온다 → 카드가 날아가는 대신 즉시 페이드아웃되고, 뒤집기는 회전 없이 전환된다. 모든 기능은 그대로 동작한다
      7. 로그인 화면의 입력 필드를 iOS Safari에서 탭한다 → 화면이 자동 확대되지 않는다 (폰트 16px 검증)
    </steps>
  </test_scenario_5>
</final_integration_test>

<success_criteria>
  <must_work>
    발표 시점에 이 5가지가 안 되면 데모가 성립하지 않는다.
    - 가입 → 로그인이 실제로 되고 새로고침해도 유지된다
    - 홈에서 카드가 좌우로 날아간다
    - 오른쪽으로 넘긴 공고가 100% 찜 목록에 나타난다 (누락 0건)
    - 찜 목록이 2x2 격자로 한 화면에 4개를 보여준다
    - 격자 카드를 탭하면 상세 정보가 보인다 (뒤집기 연출은 실패해도 정보는 보여야 한다)
  </must_work>
  <user_experience>
    - 카드 드래그가 끊기지 않는다 (실기기에서 눈으로 확인. 프로파일링까지 하지 않는다)
    - 스와이프 입력부터 카드가 움직이기 시작할 때까지 체감 지연이 없다 (응답을 기다리지 않으므로)
    - 모든 로딩 구간에 스켈레톤 또는 스피너가 있다 — **빈 흰 화면 노출 0회**
    - 모든 빈 상태에 아이콘 + 제목 + 설명 + CTA 4요소가 있다
    - 모든 터치 타겟이 44x44px 이상
    - 홈 덱을 키보드만으로 조작할 수 있다
  </user_experience>
  <technical_quality>
    - `npm run build`가 에러 없이 통과한다
    - 세 테이블 모두 RLS가 켜져 있고, 다른 계정으로 로그인했을 때 남의 찜이 보이지 않는다
    - `dangerouslySetInnerHTML`이 코드에 없다
    - 컴포넌트에 hex 색상 리터럴이 직접 박혀 있지 않다 (전부 CSS 변수 경유)
    - 모든 supabase 호출에 `if (error) throw error`가 있다
    - B의 코드에 `supabase` import가 없다 (A의 훅만 사용)
  </technical_quality>
  <team_process>
    - `src/types.ts` 외 파일에서 발생한 머지 충돌 0건
    - 소유 파일 밖을 수정한 커밋 0건
    - CP3(최초 통합)가 시작 후 4시간 안에 달성된다
    - 발표 30분 전 기능 동결이 지켜진다
  </team_process>
  <demo>
    - 배포된 URL을 실제 휴대폰에서 열어 시나리오 1이 끝까지 동작한다
    - 시드 공고 30개의 텍스트가 그럴듯하다 (faker 더미 문자열이 아님)
    - 리허설 직전 스와이프 기록이 초기화되어 있다
  </demo>
</success_criteria>

<build_output>
  <commands>
    - `npm install`
    - `npm run dev` — Vite 개발 서버 (5173). `--host` 옵션이 기본 설정돼 있어 같은 와이파이의 휴대폰에서 접속 가능
    - `npm run build` — 산출물 `dist/`
    - `npm run preview` — 빌드 결과 로컬 확인
    - `npm run lint` / `npm run format`
  </commands>
  <artifacts>
    `dist/` — 정적 자산(index.html + assets/). 어떤 정적 호스팅에도 올릴 수 있다.
    CRITICAL: SPA이므로 모든 경로를 `index.html`로 폴백하는 rewrite 규칙이 필요하다. 이게 없으면 `/wishlist`를 직접 열었을 때 404가 난다 — 배포 후 첫 번째로 터지는 문제다.
  </artifacts>
</build_output>

<deployment_and_operations>
  <hosting>
    - 프론트엔드: **Vercel**. GitHub 연동 후 `main` 푸시마다 자동 배포. 프레임워크 프리셋 Vite 선택 시 SPA rewrite가 자동 설정된다. 환경변수 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`를 대시보드에 등록한다
    - DB + Auth: Supabase 무료 티어. 우리가 배포하거나 운영할 서버가 없다
    - CRITICAL: Supabase 대시보드 > Authentication > URL Configuration의 Site URL에 Vercel 도메인을 추가한다. 이걸 빠뜨리면 배포판에서 로그인이 실패한다
  </hosting>
  <deployment_timing>
    CRITICAL: **CP3(+4:00) 시점에 한 번 배포해 본다.** 배포를 발표 직전으로 미루면 환경변수·리다이렉트 URL·SPA rewrite 문제가 한꺼번에 터진다. 실제로 동작하는 기능이 절반뿐이어도 상관없다 — 배포 경로가 뚫려 있는지를 4시간 시점에 확인하는 것이 목적이다.
  </deployment_timing>
  <rollback>
    Vercel 대시보드에서 이전 배포를 "Promote to Production"으로 즉시 되돌린다.
    CRITICAL: DB 스키마는 롤백할 방법이 없다. 발표 2시간 전부터는 `schema.sql`을 수정하지 않는다. 컬럼 삭제나 타입 변경은 절대 하지 않는다.
  </rollback>
  <demo_prep>
    - 발표 2시간 전: 담당 C가 실제 휴대폰으로 시나리오 1·2 반복 리허설, 버그를 개발자에게 전달
    - 발표 30분 전: 기능 동결. 설정 화면의 "스와이프 기록 초기화"로 데모 계정을 리셋한다
    - 데모용 계정은 미리 만들어 두고 비밀번호를 팀이 공유한다. 무대에서 가입 폼을 타이핑하다 오타가 나면 시간이 날아간다 (Q3)
  </demo_prep>
  <observability>
    별도 로깅·에러 추적을 붙이지 않는다. Supabase 대시보드의 Table Editor로 `swipes` 테이블을 직접 보는 것이 이 규모에서 가장 빠른 디버깅 수단이다.
  </observability>
</deployment_and_operations>

<key_implementation_notes>
  <critical_paths>
    이 3가지가 무너지면 데모가 성립하지 않는다. 다른 무엇보다 먼저, 가장 공들여 만든다.
    1. **스와이프 제스처의 체감 품질** — 드래그 추종이 한 프레임이라도 늦으면 앱 전체가 싸구려로 보인다. `transform`과 `opacity`만 애니메이션하고 `width`/`height`/`top`/`left`는 절대 건드리지 않는다. 카드에 `will-change: transform`을 준다
    2. **덱 제외 로직** — 이미 본 공고가 다시 나오면 심사위원이 즉시 알아챈다. 특히 `fetchDeckJobs`의 **빈 배열 분기**(스와이프 0건)를 반드시 처리한다. 신규 가입 직후 첫 화면에서 터지는 버그다
    3. **찜 격자의 비교 가치** — 4개 카드가 같은 크기·같은 위치·같은 4개 정보를 보여줘야 "한눈에 비교"라는 컨셉이 전달된다. 카드마다 높이가 다르면 컨셉 자체가 무너진다. `aspect-ratio`로 높이를 고정한다
  </critical_paths>

  <timeline>
    7시간 기준. 시간이 밀리면 뒤에서부터 자른다.

    **0:00–0:45 · 셋업 (CP1)**
    - [A] Supabase 프로젝트 생성 → **Confirm email 끄기** → `.env.local` 팀 공유 (20분)
    - [A] `src/types.ts` 작성 후 즉시 푸시 (B가 기다린다)
    - [B] Vite + React + Tailwind + 라우터 스캐폴딩, `globals.css` 토큰, Button/Input 2종
    - [C] 디자인 토큰 값 확정 통보 (이후 색 변경 요청 없음)

    **0:45–2:30 · 뼈대 (CP2)**
    - [A] `schema.sql` 실행 (테이블 3개 + RLS) → `seed.sql` 임시 10개로 먼저 넣고 나중에 30개로 교체
    - [A] `lib/supabase.ts` + `auth-context.tsx` + 로그인/회원가입 화면 → **실제로 로그인이 되는 것까지**
    - [A] `useDeck` 훅 (`fetchDeckJobs` + `createSwipe`)
    - [B] AppShell + BottomTabBar + 라우터 + `RequireAuth`
    - [B] **스와이프 덱 전체** — 목데이터로 좌우 날아가기, 스탬프, 스택, 컨트롤 버튼
    - [C] 시드 공고 30개 콘텐츠 전달 (Q1 — 이 시점을 넘기면 위험하다)

    **2:30–4:00 · 최초 통합 (CP3)**
    - [통합] B의 덱을 A의 `useDeck`에 연결. `mockJobs.ts` 삭제
    - [A] `useWishlist` 훅 + 설정 화면 (**"스와이프 기록 초기화"를 가장 먼저** — 이게 없으면 이후 모든 테스트에서 새 계정을 만들어야 한다)
    - [B] 찜 목록 2x2 격자 앞면
    - [통합] 로그인 → 스와이프 → 찜 목록에 나타남까지 관통. **여기서 막히면 남은 기능을 포기하고 이것부터 살린다**
    - [A] Vercel 배포 1회 (동작이 절반이어도 배포 경로를 뚫어 둔다)

    **4:00–5:30 · 뒤집기와 지원 (CP4)**
    - [B] 카드 확대 + 뒤집기 + 뒷면 (상세·주소·근무조건·리뷰)
    - [A] `useReviews` 훅
    - [B] 지원 화면 + 제출 동작 (Q2 결정 반영)
    - [B] 찜 해제
    - **뒤집기가 꼬이면 확대만 남기고 회전을 포기한다.** 이 판단을 5:30에 내린다

    **5:30–6:30 · 완성도**
    - 빈 상태 3종 · 로딩 스켈레톤 2종 · 에러 화면
    - 시드 데이터를 담당 C의 실제 콘텐츠 30개로 교체
    - aria-label, 포커스 링, `prefers-reduced-motion`
    - 실기기 확인

    **6:30–7:00 · 동결 (CP5)**
    - 배포 확인, 시나리오 1·2 리허설, 데모 계정 기록 초기화. **새 기능 금지**
  </timeline>

  <cut_order>
    시간이 부족할 때 자르는 순서다. 위에서부터 버린다.
    1. 접근성 다듬기 (aria-label 제외 — 이건 남긴다)
    2. 지원 화면의 실제 저장 (버튼만 남김, Q2)
    3. 카드 뒤집기 회전 (확대만 남김)
    4. 설정 화면의 통계 숫자 (닉네임·로그아웃·기록 초기화만 남김)
    5. 키보드 단축키
    절대 자르지 않는 것: 회원가입 · 스와이프 · 찜 격자 · 격자 카드 탭 시 상세 정보 노출
  </cut_order>

  <database_schema>
    `supabase/schema.sql` 전문. Supabase SQL Editor에 그대로 붙여넣어 실행한다.

    ```sql
    create table jobs (
      id uuid primary key default gen_random_uuid(),
      store_name   text not null,
      category     text not null,
      hourly_wage  integer not null,
      summary      text not null,
      description  text not null,
      address      text not null,
      work_days    text not null,
      work_hours   text not null,
      benefits     text[] default '{}',
      rating       numeric(2,1) default 0,
      review_count integer default 0,
      image_url    text,
      created_at   timestamptz default now()
    );

    create table job_reviews (
      id uuid primary key default gen_random_uuid(),
      job_id      uuid not null references jobs(id) on delete cascade,
      author_name text not null,
      rating      integer not null check (rating between 1 and 5),
      content     text not null,
      created_at  timestamptz default now()
    );
    create index on job_reviews (job_id);

    create table swipes (
      id uuid primary key default gen_random_uuid(),
      user_id    uuid not null references auth.users(id) on delete cascade default auth.uid(),
      job_id     uuid not null references jobs(id) on delete cascade,
      direction  text not null check (direction in ('left','right')),
      created_at timestamptz default now(),
      unique (user_id, job_id)
    );
    create index on swipes (user_id, direction, created_at desc);

    alter table jobs        enable row level security;
    alter table job_reviews enable row level security;
    alter table swipes      enable row level security;

    create policy "jobs are public"    on jobs        for select using (true);
    create policy "reviews are public" on job_reviews for select using (true);

    create policy "own swipes select" on swipes for select using (auth.uid() = user_id);
    create policy "own swipes insert" on swipes for insert with check (auth.uid() = user_id);
    create policy "own swipes update" on swipes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
    create policy "own swipes delete" on swipes for delete using (auth.uid() = user_id);
    ```

    CRITICAL: `jobs`와 `job_reviews`에 INSERT/UPDATE/DELETE 정책을 만들지 않는 것이 의도다. 정책이 없으면 거부가 기본값이라 앱에서 공고를 조작할 수 없다. 시드는 SQL Editor(service_role)로 넣으므로 RLS를 우회한다.
    CRITICAL: `swipes.user_id`의 default가 `auth.uid()`이므로 클라이언트는 `user_id`를 보내지 않는다. 보내면 RLS의 with check와 충돌할 여지가 생긴다.
  </database_schema>

  <types_contract>
    `src/types.ts` — A와 B 사이의 유일한 공동 파일. A가 먼저 작성해 30분 안에 푸시한다.

    ```ts
    export type Job = {
      id: string;
      storeName: string;
      category: string;
      hourlyWage: number;
      summary: string;
      description: string;
      address: string;
      workDays: string;
      workHours: string;
      benefits: string[];
      rating: number;
      reviewCount: number;
      imageUrl: string | null;
    };

    export type Review = {
      id: string;
      jobId: string;
      authorName: string;
      rating: number;
      content: string;
      createdAt: string;
    };

    export type SwipeDirection = 'left' | 'right';

    export type WishlistEntry = {
      job: Job;
      createdAt: string;
    };
    ```

    CRITICAL: DB 컬럼은 snake_case, 앱 타입은 camelCase다. 변환은 **A의 `lib/api/` 안에서만** 한다. B의 컴포넌트에 `store_name` 같은 snake_case가 등장하면 경계가 무너진 것이다.
  </types_contract>

  <performance>
    - 카드 애니메이션은 `transform`과 `opacity`만. 레이아웃을 유발하는 속성은 애니메이션하지 않는다
    - DOM에 카드 3장만 유지한다. 30장을 다 렌더하면 저사양 안드로이드에서 프레임이 떨어진다
    - 시드 이미지는 외부 URL의 크기 파라미터로 작게 요청한다 (예: Unsplash `?w=600`). 원본 4000px 이미지를 카드에 넣으면 3G에서 덱이 멈춘다
    - 데이터가 30건뿐이므로 페이지네이션·인덱스 최적화는 하지 않는다. 여기에 시간을 쓰지 않는다
  </performance>

  <anti_conflict_reminders>
    2명 · 7시간에서 실제로 터지는 지점이다. 팀 채널에 고정해 둔다.
    1. **`src/types.ts`** — 단독 커밋 + 즉시 공지. 필드 추가는 자유, 삭제는 합의 후
    2. **`router.tsx`** — B 단독 소유. A가 새 라우트가 필요하면 요청한다. 모두가 건드리고 싶어 하는 파일이라 가장 자주 터진다
    3. **`globals.css`** — B 단독 소유. A가 색이 필요하면 이미 정의된 토큰을 쓴다
    4. **`package.json`** — 라이브러리 추가 시 즉시 푸시하고 알린다
    5. **`package-lock.json`** — 충돌 시 수동 병합 금지. `git checkout --theirs` 후 `npm install`
    6. **Prettier 설정** — 루트에 하나만. 개인 에디터 설정으로 덮어쓰지 않는다. 이것 때문에 diff가 폭발하면 충돌 해결이 불가능해진다
    7. **`supabase/schema.sql`** — A 단독 소유. 스키마를 바꾸면 팀에 알린다 (B의 목데이터도 맞춰야 한다)
  </anti_conflict_reminders>

  <gotchas>
    7시간 안에 실제로 시간을 잡아먹는 함정들이다. 미리 읽어 두면 각각 20~40분을 아낀다.
    1. **Confirm email이 켜져 있으면** 가입 후 로그인이 안 된다. 대시보드에서 먼저 끈다
    2. **`.not('id','in','()')`** — 스와이프 0건일 때 SQL 문법 오류. 빈 배열 분기를 반드시 둔다
    3. **`insert` 대신 `upsert`** — swipes에 UNIQUE 제약이 있어 재시도나 중복 탭에서 즉시 에러가 난다
    4. **`if (error) throw error` 누락** — supabase-js는 throw하지 않는다. 빠뜨리면 실패가 조용히 무시되고 빈 화면만 나온다
    5. **세션 복구 중 isLoading 미처리** — 새로고침할 때마다 로그인 화면이 깜빡인다
    6. **입력 폰트 16px 미만** — iOS Safari에서 탭할 때 화면이 자동 확대된다
    7. **SPA rewrite 미설정** — 배포판에서 `/wishlist`를 직접 열면 404
    8. **Supabase Site URL 미등록** — 배포판에서 로그인이 실패한다
    9. **`touch-action: none` 누락** — 카드를 드래그할 때 페이지가 같이 스크롤된다
    10. **`100vh` 사용** — iOS에서 주소창 때문에 탭바가 화면 밖으로 밀린다. `100dvh`를 쓴다
  </gotchas>

  <tool_usage>
    - Supabase 대시보드 **Table Editor** — `swipes` 테이블을 직접 본다. 스와이프가 실제로 저장됐는지 확인하는 가장 빠른 방법이다
    - Supabase **SQL Editor** — 스키마와 시드 실행, 데이터 강제 수정
    - **실기기 접속** — `npm run dev`가 `--host`로 뜨므로 같은 와이파이의 휴대폰에서 `http://<개발기기IP>:5173`으로 접속한다. 스와이프와 뒤집기는 반드시 실기기에서 확인한다
    - React Query Devtools는 설치하지 않는다. queryKey가 3개뿐이라 콘솔 로그로 충분하다
  </tool_usage>
</key_implementation_notes>

</project_specification>
