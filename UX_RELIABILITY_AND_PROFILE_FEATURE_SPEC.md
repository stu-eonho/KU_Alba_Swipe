<feature_specification>
<feature_name>AlbaSwipe UX 안정화 · 설정 정보 구조 · 지원 상세 · 프로필 확장 · 인앱 알림</feature_name>

<overview>
이 기능 묶음은 신규 구직자의 첫 사용 흐름부터 공고 탐색, 찜, 지원, 지원 결과 확인까지 끊기지 않는 사용자 여정을 완성한다. 현재 확인된 실제 결함인 브라우저 공용 튜토리얼 완료 키, 중복 지원을 덮어쓰는 `upsert`, 지원 현황 행의 비활성 상태, 홈 카드 탭 상세의 실기기 불안정성을 우선 해결한다.

하단의 `내정보` 탭은 `설정` 탭으로 교체한다. 설정 허브 아래에 `내 정보 수정`, `지원 현황`, `찜한 가게`, `튜토리얼 다시 보기`, 기록 초기화, 로그아웃을 배치한다. 구직자 프로필에는 MBTI와 성격 키워드를 추가하고, 희망 시급은 숫자 키보드로 직접 입력하되 브라우저 증감 스피너는 제거한다.

상단 우측에는 모든 주 화면에서 접근 가능한 알림 버튼을 추가한다. 이번 범위에서는 지원 접수와 지원 상태 변경을 인앱 알림으로 제공하며, 알림 행은 `type`, 관련 지원서, 공고, 확장 가능한 JSON payload를 가진다. 이후 채팅, 새 공고, 채용 제안 등의 이벤트를 같은 구조에 추가할 수 있어야 한다.

CRITICAL: 프론트엔드가 Supabase에 직접 접근하므로 데이터 보안은 RLS와 DB trigger가 경계다. 중복 지원 차단은 버튼 상태만으로 끝내지 않고 기존 `unique (user_id, job_id)` 제약과 `insert` 오류 처리로 보장한다. A와 B는 아래 파일 소유권을 교차 수정하지 않는다.
</overview>

<assumptions>
- `같은 가게에 다시 지원`은 현재 데이터 모델에서 같은 `job_id`의 공고에 다시 지원하는 경우를 뜻한다. 현재 한 가게당 공고 1건이므로 사용자 관점의 가게 중복과 일치한다. 향후 한 가게에 여러 공고를 허용하면 `stores` 엔터티와 `store_id` 기준 정책이 별도로 필요하다.
- 알림은 이번 범위에서 앱 내부 알림만 지원한다. OS push, SMS, 이메일은 외부 권한과 발송 서비스가 필요하므로 제외한다.
- 성격 키워드는 자유 입력이 아니라 고정 목록에서 최대 5개를 선택한다. 검색, 혐오 표현 필터링, 표기 통일이 필요 없는 가장 안전한 MVP 방식이다.
- MBTI는 16개 표준 값과 `선택 안 함`만 허용한다. 소문자 입력이나 자유 텍스트는 저장하지 않는다.
- 기존 `/wishlist` 기능은 유지하되 사용자 노출 명칭을 `찜한 가게`로 통일한다. 별도의 두 번째 찜 기능이나 테이블은 만들지 않는다.
- 기존 사용자에게는 새 튜토리얼 버전을 한 번 보여준다. 이번 변경에서 키 버전을 `v2`로 올리는 것은 카드 상세와 설정 구조가 바뀌었기 때문이다.
- 새 테스트 라이브러리는 추가하지 않는다. 현재 저장소에 자동 테스트 프레임워크가 없으므로 `lint`, `build`, SQL 검증, 모바일 브라우저 수동 시나리오를 병합 게이트로 사용한다.
</assumptions>

<open_questions>
- Q1. 향후 같은 사업자의 여러 공고를 하나의 `가게`로 묶어 중복 지원을 막아야 하는가? 현재 릴리스는 `job_id` 기준으로 완결하며, 필요 시 다음 단계의 `stores` 정규화 범위를 결정한다.
- Q2. 다음 알림 채널 우선순위는 Web Push, 이메일, 카카오 알림 중 무엇인가? 이번 인앱 알림에는 영향이 없고 후속 third-party integration 선택에만 필요하다.
- Q3. 성격 키워드 자유 입력을 향후 허용할 것인가? 이번 릴리스는 고정 목록 최대 5개로 완결하며, 답변은 후속 moderation과 검색 설계에만 필요하다.
</open_questions>

<existing_codebase_context>
  <stack>
  - React `19.3.0`, React DOM `19.3.0`, TypeScript `5.9.3`
  - Vite `8.3.0`, Tailwind CSS `4.3.3`
  - React Router DOM `7.18.3`, TanStack React Query `5.102.8`
  - Supabase JS `2.116.0`, Motion `13.2.0`, use-gesture `10.3.1`, lucide-react `1.45.0`
  - Vercel 정적 배포, Supabase PostgreSQL/Auth 직접 호출
  </stack>

  <verified_current_state>
  - 기준 브랜치와 커밋: `main` at `ae4b192`.
  - 튜토리얼은 `albaswipe.tutorial.seen` 단일 localStorage 키를 사용한다. 같은 브라우저의 새 계정은 첫 가입이어도 튜토리얼이 생략된다.
  - `Tutorial`의 내부 open 상태는 최초 렌더 한 번만 계산하므로 같은 React 트리에서 사용자 변경 시 재평가되지 않는다.
  - `applyToJob()`은 `upsert`를 사용해 두 번째 지원이 오류 없이 기존 메시지를 덮어쓴다.
  - DB에는 이미 `unique (user_id, job_id)`가 있으므로 API를 `insert`로 바꾸면 서버 측 중복 차단이 가능하다.
  - `MyApplication`은 이미 공고 전체, 지원 메시지, 상태, 지원 시각을 포함하지만 `ProfileEditor`의 지원 현황 행에는 클릭 동작이 없다.
  - `ProfileEditor`의 희망 시급은 `input type="number" step="100"`이라 브라우저 증감 UI가 노출된다.
  - `TopBar`와 `AppShell`에는 이미 우측 슬롯이 있으나 `MainLayout`이 알림 버튼을 주입하지 않는다.
  - 홈 카드 탭 경로는 `SwipeCard` → `useSwipeGesture` → `CardStack` → `HomeDeckPage` → `ExpandedCard`로 연결돼 있으나 실기기에서 재현 검증이 끝나지 않았다.
  - `ExpandedCard`는 포커스 트랩, Escape, backdrop, 리뷰 및 공고 상세를 이미 제공한다. 새 상세 모달을 만들지 않는다.
  </verified_current_state>

  <conventions>
  - DB의 `snake_case`를 앱의 `camelCase`로 바꾸는 코드는 `src/lib/api/`에만 둔다.
  - 모든 Supabase 호출 뒤에 `if (error) throw error`를 둔다. Supabase JS가 자동으로 throw한다고 가정하지 않는다.
  - 서버 상태는 TanStack React Query를 사용하며 query key는 기능 접두사 배열로 구성한다.
  - 화면은 Supabase를 직접 import하지 않고 A가 제공한 API 또는 hook을 사용한다. 가입 완료 직후 사용자 ID 조회라는 기존 예외는 이번 작업에서 확대하지 않는다.
  - UI 색상은 `src/styles/globals.css` 토큰만 사용한다. 컴포넌트에 hex 리터럴, `color-mix()`, 그림자를 추가하지 않는다.
  - 본문 입력은 16px 이상, 터치 타깃은 최소 44px, 뷰포트 높이는 `100dvh`를 사용한다.
  - 모션은 120ms 피드백 또는 200ms 전환을 기본으로 하고 `transform`과 `opacity`만 애니메이션한다.
  - `layoutId`가 같은 두 요소를 동시에 마운트하지 않는다. 확대 중 원본은 투명 처리하지 말고 언마운트 후 동일 크기 placeholder로 교체한다.
  - 공용 계약 `src/types.ts`는 단독 커밋, `contract:` 접두사, 즉시 동기화를 지킨다.
  </conventions>

  <relevant_modules>
  - `src/features/onboarding/Tutorial.tsx`, `tutorialStorage.ts`: 사용자별 튜토리얼 v2 대상.
  - `src/lib/api/applications.ts`, `src/hooks/useApply.ts`: 중복 지원 판정과 지원 상세 데이터 계약.
  - `src/features/apply/ApplyForm.tsx`, `src/features/wishlist/BackFace.tsx`: 지원 버튼 상태와 완료 CTA.
  - `src/features/profile/ProfileEditor.tsx`: MBTI, 성격 키워드, 희망 시급 입력, 기존 지원 현황 분리 대상.
  - `src/pages/SettingsPage.tsx`, `src/router.tsx`, `src/components/layout/BottomTabBar.tsx`: 설정 중심 정보 구조.
  - `src/components/layout/TopBar.tsx`, `AppShell.tsx`: 알림 버튼 슬롯.
  - `src/features/deck/SwipeCard.tsx`, `useSwipeGesture.ts`, `CardStack.tsx`, `src/pages/HomeDeckPage.tsx`: 카드 탭 상세 회귀 수정.
  - `supabase/schema_phase2.sql`: 기존 프로필, 지원서, RLS 기준. 직접 수정하지 않고 새 additive migration을 만든다.
  </relevant_modules>

  <reuse_do_not_reinvent>
  - 공고 상세: `ExpandedCard`와 `BackFace`를 확장해서 사용한다.
  - 확인 다이얼로그와 토스트: `src/components/ui` 구현을 우선 사용한다. 새 기능에서 세 번째 구현을 만들지 않는다.
  - 로딩, 빈 상태, 버튼, 아이콘 버튼, 배지, 칩: `src/components/ui`를 사용한다.
  - 공고 표시 형식: `formatWage`, `JobThumb`, 기존 `Job` 타입을 사용한다.
  - 리뷰: `useReviews(jobId)`를 재사용한다.
  - 인증 사용자와 role: `useAuth()`를 사용한다.
  </reuse_do_not_reinvent>
</existing_codebase_context>

<scope_boundaries>
  <in_scope>
  - 신규 계정별 첫 구직자 홈 진입 시 튜토리얼 v2 자동 표시.
  - 설정 탭과 설정 허브, 내 정보 수정 하위 화면, 지원 현황 하위 화면 및 지원 상세 화면.
  - 희망 시급 증감 스피너 제거와 직접 숫자 입력 유지.
  - 기존 찜 화면 유지 및 `찜한 가게` 명칭 통일.
  - 같은 공고에 대한 두 번째 지원을 UI와 DB 양쪽에서 차단.
  - 지원 완료 버튼, 지원 내용 보기, 지원 상세에서 공고 전체 정보와 제출 메시지 확인.
  - 구직자 프로필 MBTI와 성격 키워드 최대 5개 저장 및 사업자 지원자 상세 노출.
  - 홈 맨 위 카드의 탭 상세를 Android Chrome과 iOS Safari 기준으로 복구.
  - 상단 우측 알림 버튼, 읽지 않은 수 배지, 알림 목록, 단건 읽음, 모두 읽음.
  - 지원 접수 시 사업자 알림, 지원 상태 변경 시 구직자 알림 생성.
  </in_scope>

  <out_of_scope>
  - OS push notification, 이메일, SMS, 카카오 알림 발송.
  - 알림 마케팅 수신 설정과 방해 금지 시간.
  - MBTI 검사, 성격 분석, AI 추천.
  - 사용자 정의 성격 키워드와 키워드 검색.
  - 사진 및 이력서 업로드.
  - 동일 가게의 복수 공고를 묶는 `stores` 정규화.
  - 지원 취소, 지원서 수정, 재지원.
  - 사업자 공고 CRUD와 사업자 프로필 편집.
  - 기존 스와이프 추천 순서 변경.
  </out_of_scope>

  <future_considerations>
  - Phase N1: Supabase Realtime로 새 알림 즉시 반영.
  - Phase N2: Web Push 또는 이메일 채널과 사용자별 알림 설정.
  - Phase N3: `stores` 테이블 추가 후 가게 단위 중복 지원 정책.
  - Phase N4: 채팅, 면접 일정, 새 공고, 채용 제안을 notification type으로 확장.
  </future_considerations>
</scope_boundaries>

<data_model_changes>
  <change entity="SeekerProfile">
  - ADD `mbti`: nullable text, 허용값은 `INTJ`, `INTP`, `ENTJ`, `ENTP`, `INFJ`, `INFP`, `ENFJ`, `ENFP`, `ISTJ`, `ISFJ`, `ESTJ`, `ESFJ`, `ISTP`, `ISFP`, `ESTP`, `ESFP`.
  - ADD `personality_traits`: non-null text array, default empty array, 최대 5개.
  - 허용 키워드: `활발함`, `소심함`, `차분함`, `성실함`, `책임감`, `친절함`, `긍정적`, `꼼꼼함`, `협업형`, `빠른 습득`, `체력 좋음`, `시간 약속`.
  - 기존 행은 `mbti = null`, `personality_traits = '{}'`로 즉시 호환된다. 백필 UI 작업은 없다.
  </change>

  <change entity="Notification">
  - ADD TABLE `notifications`.
  - `id`: uuid primary key, default `gen_random_uuid()`.
  - `recipient_id`: uuid not null FK to `auth.users(id)`, on delete cascade.
  - `actor_id`: uuid nullable FK to `auth.users(id)`, on delete set null.
  - `type`: text not null, enum check `application_received`, `application_viewed`, `application_accepted`, `application_rejected`, `system`.
  - `application_id`: uuid nullable FK to `applications(id)`, on delete cascade.
  - `job_id`: uuid nullable FK to `jobs(id)`, on delete cascade.
  - `title`: text not null, max 80 characters enforced in trigger.
  - `body`: text not null, max 240 characters enforced in trigger.
  - `payload`: jsonb not null default empty object. 이후 route params와 기능별 메타데이터를 추가하는 확장 지점이다.
  - `read_at`: timestamptz nullable. null이면 읽지 않음.
  - `created_at`: timestamptz not null default `now()`.
  - `dedupe_key`: text not null unique. 같은 이벤트 재실행 시 중복 행을 만들지 않는다.
  - INDEX `notifications_recipient_created_idx (recipient_id, created_at desc)`.
  - INDEX `notifications_unread_idx (recipient_id, created_at desc) where read_at is null`.
  </change>

  <unchanged entity="Application">
  - 기존 `unique (user_id, job_id)`를 유지한다.
  - 두 번째 지원은 기존 행 update가 아니라 PostgreSQL code `23505`로 실패해야 한다.
  - 기존 지원 행의 `message`, `status`, `created_at`은 마이그레이션으로 변경하지 않는다.
  </unchanged>

  <migration_file>
  - 새 파일: `supabase/schema_phase3_ux.sql`.
  - 기존 `schema.sql`과 `schema_phase2.sql`을 수정하거나 재실행 전제로 만들지 않는다.
  - 모든 DDL은 재실행 가능한 `if not exists` 또는 안전한 DO block을 사용한다.
  - 적용 순서: 앱 배포 전 DB migration 먼저. 새 컬럼과 테이블이 additive이므로 현재 앱은 계속 동작한다.
  </migration_file>

  <row_level_security>
  - `notifications`에 RLS를 enable 한다.
  - SELECT: `auth.uid() = recipient_id`인 행만 허용.
  - UPDATE: `auth.uid() = recipient_id`인 행에서 `read_at` 갱신만 허용. 클라이언트가 `recipient_id`, `type`, `payload` 등을 바꿀 API는 제공하지 않는다.
  - INSERT와 DELETE client policy는 만들지 않는다. 알림 생성은 DB trigger 전용이다.
  - grant는 authenticated에 SELECT, UPDATE만 부여한다.
  - `seeker_profiles`의 기존 본인 및 지원 사업자 SELECT 정책은 유지한다. 새 두 컬럼도 같은 행 정책으로 보호된다.
  </row_level_security>

  <database_triggers>
  - `applications` INSERT 후 공고의 `employer_id`가 있을 때 사업자에게 `application_received` 알림을 1건 생성한다.
  - `applications.status` UPDATE 후 값이 실제로 바뀐 경우 구직자에게 상태별 알림을 1건 생성한다.
  - `viewed`, `accepted`, `rejected`만 구직자 알림을 생성하며 동일 상태 재저장은 알림을 만들지 않는다.
  - trigger function은 `security definer set search_path = public`로 정의하고 고정 SQL만 실행한다.
  - dedupe key 형식: `application:{application_id}:received` 또는 `application:{application_id}:status:{status}`.
  - 알림 제목과 본문은 trigger가 job의 `store_name`을 조회해 생성한다. 클라이언트가 임의 제목으로 알림을 발송할 수 없어야 한다.
  </database_triggers>
</data_model_changes>

<api_changes>
  <modified module="src/lib/api/applications.ts">
  - `applyToJob(jobId, message)`는 `.upsert()` 대신 `.insert()`를 사용한다.
  - Supabase error code가 `23505`이면 `AlreadyAppliedError`로 변환한다. 그 외 오류는 그대로 throw한다.
  - `fetchMyApplicationByJob(jobId)`를 추가한다. 반환형은 `MyApplication | null`, 0건은 정상 상태라 `maybeSingle()`을 사용한다.
  - `fetchMyApplication(applicationId)`를 추가한다. RLS가 본인 행만 반환하며 없는 경우 null.
  - `fetchMyApplications()`의 기존 반환 필드와 최신순 정렬은 유지한다.
  </modified>

  <modified module="src/hooks/useApply.ts">
  - `useApply(jobId?)`는 `existingApplication`, `isChecking`, `apply`, `isApplying`, `applyError`를 반환한다.
  - query key: `['applications', 'by-job', jobId]`.
  - 성공 시 `['applications']`, `['notifications']` 관련 캐시를 invalidate 한다.
  - `AlreadyAppliedError`는 콘솔 error가 아니라 정상 비즈니스 분기로 노출한다.
  - `useMyApplication(applicationId)`를 추가한다. 상세 화면에서 직접 새로고침해도 데이터를 가져온다.
  - 기존 `useMyApplications()` 공개 반환값은 깨지지 않게 유지한다.
  </modified>

  <modified module="src/lib/api/profiles.ts">
  - row type과 mapper에 `mbti`, `personality_traits`를 추가한다.
  - `SeekerProfilePatch`에 `mbti`, `personalityTraits`를 추가한다.
  - save payload는 정의된 필드만 조건부 포함하고 모든 Supabase error를 throw한다.
  </modified>

  <added module="src/lib/api/notifications.ts">
  - `fetchNotifications(limit = 50)`: 최신순 알림 최대 50건과 관련 job/application 최소 정보를 반환.
  - `fetchUnreadNotificationCount()`: exact count, `read_at is null`.
  - `markNotificationRead(id)`: 아직 안 읽은 본인 알림의 `read_at`만 현재 시각으로 변경.
  - `markAllNotificationsRead()`: 본인의 `read_at is null` 행을 한 번에 갱신.
  - 모든 호출은 명시적으로 error를 throw한다.
  </added>

  <added module="src/hooks/useNotifications.ts">
  - `useNotifications()`: `notifications`, loading, error, retry, markRead, markAllRead.
  - `useUnreadNotificationCount()`: 숫자, loading 상태.
  - query keys: `['notifications', 'list']`, `['notifications', 'unread-count']`.
  - 기본 stale time 15초, refetch interval 30초, window focus refetch 활성.
  - 읽음 처리는 낙관적으로 list와 count를 동시에 갱신하고 실패 시 둘 다 rollback한다.
  - 실시간 채널은 이번 범위에서 붙이지 않는다.
  </added>

  <error_contracts>
  - `AlreadyAppliedError`: code `ALREADY_APPLIED`, 사용자 메시지 `이미 지원을 완료한 가게예요`.
  - `NotFound`: 상세 route의 지원서가 없거나 RLS로 볼 수 없으면 동일한 빈 상태를 반환해 존재 여부를 노출하지 않는다.
  - API가 실패하면 빈 배열로 가장하지 않는다. hook의 `isError`가 UI에 전달돼야 한다.
  </error_contracts>
</api_changes>

<ui_changes>
  <modified_view name="Tutorial">
  - `Tutorial`은 필수 `userId`를 받는다. router의 seeker layout이 `user.id`를 전달하고 `key={user.id}`로 사용자 변경 시 remount한다.
  - storage key는 `albaswipe.tutorial.seen.v2:{userId}` 형식이다.
  - legacy global key는 새 계정의 표시 여부 판단에 사용하지 않는다.
  - localStorage 읽기가 실패하면 이번 세션에는 튜토리얼을 표시한다. 닫기 상태는 컴포넌트 메모리에 남겨 route 이동마다 반복되지 않게 한다.
  - X, 다음, 시작하기, 점 indicator, focus trap, Escape, scroll lock의 기존 동작은 유지한다.
  - 사업자 계정에는 자동 튜토리얼을 띄우지 않는다.
  </modified_view>

  <modified_view name="BottomTabBar">
  - 구직자: `홈` → `찜한 가게` → `설정`.
  - 사업자: `지원자` → `내 공고` → `설정`.
  - 세 번째 탭 route는 두 역할 모두 `/settings`, icon은 `Settings`.
  - 기존 `/me`는 삭제하지 않고 역할별 호환 redirect만 제공한다.
  - 찜 배지와 활성 탭 표시 규칙은 유지한다.
  </modified_view>

  <modified_view name="SettingsPage">
  - 페이지 제목 `설정`.
  - 상단 계정 요약은 닉네임, 이메일, 역할을 표시한다.
  - 구직자 메뉴 순서: `내 정보 수정`, `지원 현황`, `찜한 가게`, `튜토리얼 다시 보기`, `스와이프 기록 초기화`, `로그아웃`.
  - 사업자 메뉴 순서: `알림`, `로그아웃`. 기존 준비 중 기능을 설정에 새로 노출하지 않는다.
  - `내 정보 수정`은 `/settings/profile`, `지원 현황`은 `/settings/applications`, `찜한 가게`는 `/wishlist`로 이동한다.
  - `튜토리얼 다시 보기`는 현재 사용자 v2 key를 지우고 controlled Tutorial을 즉시 연다.
  - 초기화와 로그아웃 confirm 동작은 유지한다.
  </modified_view>

  <modified_view name="ProfileEditor">
  - route는 `/settings/profile`, top bar title은 `내 정보 수정`.
  - 프로필 지원 현황 목록과 `계정 및 설정` 링크를 제거한다. 각각 전용 설정 하위 화면으로 이동한다.
  - 필드 순서: 아바타, 자기소개, 경력, MBTI, 성격 키워드, 관심 직종, 희망 시급, 저장.
  - MBTI는 native select 또는 접근 가능한 custom select로 제공한다. 첫 옵션은 `선택 안 함`, 나머지는 16개 값.
  - 성격 키워드는 Chip 다중 선택, 최대 5개. 선택 수 `N / 5`를 표시하고 5개 선택 후 미선택 Chip은 disabled 처리한다.
  - 희망 시급은 `type="text"`, `inputMode="numeric"`, pattern numeric을 사용한다. 브라우저 증감 화살표가 없어야 한다.
  - 희망 시급 입력은 쉼표를 허용해 정규화하거나 숫자만 허용한다. 저장값은 0 이상 정수, 상한 1,000,000원.
  - 저장 후 성공 toast, 실패 시 입력값 유지와 error toast.
  </modified_view>

  <added_view name="MyApplicationsPage" route="/settings/applications">
  - top bar title `지원 현황`, 좌측 뒤로가기 `/settings`.
  - 최신순 리스트 각 행에 가게명, 공고 category, 지원일, 상태 Badge, chevron을 표시한다.
  - 전체 행은 최소 64px 버튼이고 탭하면 `/settings/applications/:applicationId`로 이동한다.
  - empty state: `아직 지원한 가게가 없어요`, CTA `찜한 가게 보기`.
  - loading skeleton 3행, error state와 retry button.
  </added_view>

  <added_view name="ApplicationDetailPage" route="/settings/applications/:applicationId">
  - top bar title `지원 상세`, 좌측 뒤로가기.
  - 상단 상태 요약: 상태 Badge, 지원 시각, 가게명.
  - `내가 보낸 내용` section은 제출 message 원문을 `white-space: pre-wrap`으로 표시한다. message가 null이면 `작성한 한마디가 없어요`.
  - `지원한 가게` section은 시급, 근무 요일, 근무 시간, 주소, benefits, 상세 설명, 평점, 리뷰를 표시한다.
  - 공고 상세 표시는 `BackFace`의 content section을 재사용 가능하게 분리한다. 지원하기 CTA는 렌더하지 않는다.
  - 직접 URL 새로고침 시 `useMyApplication(id)`로 복구한다. 캐시에만 의존하지 않는다.
  - 없는 ID나 권한 없는 ID는 `지원 내역을 찾을 수 없어요`와 설정으로 돌아가기 CTA.
  </added_view>

  <modified_view name="ApplyFormAndJobDetail">
  - 공고 상세가 열릴 때 `useApply(job.id)`로 기존 지원 여부를 조회한다.
  - 미지원 상태: 기존 `지원하기`와 `지원서 보내기` CTA.
  - 확인 중: CTA disabled, label `지원 여부 확인 중`.
  - 지원 완료 상태: primary 제출 CTA를 disabled `지원 완료`로 바꾸고 secondary `지원 내용 보기`를 제공한다.
  - 이미 지원한 사용자가 `/apply/:jobId`를 직접 열면 작성 form 대신 완료 panel을 표시한다.
  - 동시에 두 탭에서 제출해 한쪽이 `ALREADY_APPLIED`를 받으면 성공과 동일한 완료 화면으로 전환하고 메시지를 덮어쓰지 않는다.
  - 성공 후 `/wishlist` 강제 이동 대신 `지원 완료` 상태와 `지원 내용 보기`, `찜한 가게로 돌아가기`를 보여준다. 최소 800ms 지연은 제거한다.
  </modified_view>

  <modified_view name="HomeCardDetail">
  - 맨 위 카드의 짧은 탭은 항상 `ExpandedCard`를 연다. 드래그, 버튼, 키보드 스와이프와 배타적이어야 한다.
  - 검증 기준: 누름 500ms 이하, 누적 이동 8px 이하인 pointer interaction. 이동 9px 이상이면 상세를 열지 않는다.
  - 이미지, 텍스트, 빈 여백 어느 지점을 탭해도 동일하게 열린다.
  - `onCardTap` 호출 직전 job id를 현재 top job과 대조해 뒤 카드가 열리는 race를 막는다.
  - 상세가 열린 동안 원본 layoutId 요소는 언마운트하고 placeholder를 유지한다.
  - 상세가 열린 동안 drag binding, 전역 화살표 listener, swipe controls를 모두 비활성화한다.
  - 상세의 X, backdrop, Escape로 닫으면 같은 카드가 그대로 복귀한다.
  - use-gesture의 `tap` 결과가 대상 모바일 브라우저에서 불안정하면 pointer down/up의 `pointerId`, 누적 경로 거리, 시간으로 fallback하되 tap 판단 함수는 한 곳에만 둔다. click과 gesture가 이중 호출되지 않게 consumed ref를 둔다.
  </modified_view>

  <added_view name="NotificationBell">
  - MainLayout의 TopBar 우측에 44px Bell icon button.
  - unread가 1 이상이면 우상단 16px badge. 99 초과는 `99+`.
  - aria label은 `알림` 또는 `읽지 않은 알림 N개`.
  - 탭하면 `/notifications`로 이동한다.
  - 로그인, 회원가입, 지원 작성 fullscreen layout에는 표시하지 않는다.
  </added_view>

  <added_view name="NotificationsPage" route="/notifications">
  - top bar title `알림`, 좌측 뒤로가기, 우측 text button `모두 읽음`.
  - 행 높이 최소 72px. unread는 `bg-brand-soft`와 6px ink dot, read는 surface.
  - 행 내용: type icon, title, body 최대 2줄, 상대 시간.
  - application type 행 탭 시 먼저 read 처리하고 해당 `/settings/applications/:applicationId` 또는 사업자의 `/employer/applicants`로 이동한다.
  - empty state: `새 알림이 없어요`.
  - loading skeleton 4행, error state와 retry button.
  - `모두 읽음`은 unread 0이면 disabled.
  </added_view>

  <accessibility_and_responsive>
  - 모든 행 전체가 button 또는 Link여야 하며 중첩 interactive element를 만들지 않는다.
  - icon-only button은 `IconButton`의 required label을 사용한다.
  - 새 badge와 상태 변화는 색만으로 구분하지 않고 텍스트 또는 dot을 병행한다.
  - modal은 focus trap, Escape, 닫힌 뒤 trigger focus 복귀를 유지한다.
  - 0–480px에서 단일 열, max width 480px. 320px 폭에서도 가로 scroll이 없어야 한다.
  - iOS safe area와 키보드가 열린 상태에서 저장 및 제출 버튼이 가려지지 않아야 한다.
  - `prefers-reduced-motion`에서 기능 손실 없이 즉시 전환한다.
  </accessibility_and_responsive>
</ui_changes>

<integration_points>
  <contract file="src/types.ts" owner="A then frozen">
  - `SeekerProfile`에 rollout-safe 계약으로 `mbti?: Mbti | null`, `personalityTraits?: PersonalityTrait[]` 추가. 기존 mapper가 포함된 다른 브랜치도 contract commit 직후 계속 build되어야 한다.
  - `Mbti` 16값 union, `PersonalityTrait` 12값 union 추가.
  - `NotificationType`, `NotificationItem` 추가.
  - 기존 타입 필드는 삭제하거나 이름을 바꾸지 않는다.
  - 이 파일만 포함한 `contract:` 커밋을 A가 가장 먼저 push하고 B가 즉시 rebase한다.
  </contract>

  <ownership owner="A">
  - `supabase/schema_phase3_ux.sql`
  - `src/types.ts` 계약 단독 커밋
  - `src/lib/api/applications.ts`
  - `src/lib/api/profiles.ts`
  - `src/lib/api/notifications.ts`
  - `src/hooks/useApply.ts`
  - `src/hooks/useNotifications.ts`
  </ownership>

  <ownership owner="B">
  - `src/router.tsx`
  - `src/components/layout/AppShell.tsx`
  - `src/components/layout/BottomTabBar.tsx`
  - `src/features/onboarding/Tutorial.tsx`
  - `src/features/onboarding/tutorialStorage.ts`
  - `src/features/profile/ProfileEditor.tsx`
  - `src/features/apply/ApplyForm.tsx`
  - `src/features/wishlist/BackFace.tsx`
  - `src/features/wishlist/ExpandedCard.tsx`
  - `src/features/deck/SwipeCard.tsx`
  - `src/features/deck/useSwipeGesture.ts`
  - `src/features/deck/CardStack.tsx`
  - `src/pages/HomeDeckPage.tsx`
  - `src/pages/ApplyPage.tsx`
  - `src/pages/SettingsPage.tsx` — 이번 기능에서 기존 A 소유권을 B에게 명시적으로 이관. A는 이 파일을 수정하지 않는다.
  - `src/pages/MyApplicationsPage.tsx`
  - `src/pages/ApplicationDetailPage.tsx`
  - `src/pages/NotificationsPage.tsx`
  - `src/features/notifications/NotificationBell.tsx`
  - `src/features/notifications/NotificationList.tsx`
  </ownership>

  <shared_seams>
  - A의 `useApply(jobId)` 반환 계약이 확정되기 전 B는 mock hook이나 Supabase direct call을 만들지 않는다.
  - `SettingsPage.tsx`는 이번 작업 시작 전에 B로 소유권을 이관하고 두 브랜치 모두 이 결정을 기록한다. A는 설정 UI를 수정하지 않는다.
  - A는 UI 파일을 수정하지 않고 필요한 상태를 hook으로 제공한다.
  - B는 `src/lib`, `src/hooks`, `supabase`를 수정하지 않는다.
  - 통합자는 A contract → A data → B UI 순서로 merge한다.
  </shared_seams>

  <query_cache_contract>
  - 지원 목록: `['applications', 'mine']`.
  - 공고별 내 지원: `['applications', 'by-job', jobId]`.
  - 지원 단건: `['applications', 'detail', applicationId]`.
  - 알림 목록: `['notifications', 'list']`.
  - unread count: `['notifications', 'unread-count']`.
  - 지원 성공 후 목록과 공고별 지원 cache를 서버 결과로 갱신하거나 invalidate한다.
  - 알림 읽음 후 목록과 unread count가 같은 프레임에 낙관적으로 바뀌어야 한다.
  </query_cache_contract>
</integration_points>

<core_functionality>
  <flow id="F1" name="신규 계정 튜토리얼">
  1. 구직자가 가입을 완료하고 `/`에 처음 진입한다.
  2. Tutorial이 `v2:{userId}` 키를 확인한다.
  3. 값이 없으면 홈 카드보다 높은 z-index로 즉시 열린다.
  4. 사용자가 X 또는 시작하기로 닫으면 해당 사용자 키만 기록한다.
  5. 같은 사용자는 다음 로그인에서 자동 표시되지 않고, 다른 신규 계정은 같은 브라우저에서도 표시된다.
  </flow>

  <flow id="F2" name="설정 중심 탐색">
  1. 사용자가 하단 `설정` 탭을 연다.
  2. 설정 허브에서 내 정보, 지원 현황, 찜한 가게로 이동한다.
  3. 하위 화면의 뒤로가기는 설정 허브로 돌아간다.
  4. 브라우저 뒤로가기와 직접 URL 진입도 같은 결과를 제공한다.
  </flow>

  <flow id="F3" name="프로필 확장 저장">
  1. 구직자가 MBTI 하나와 성격 키워드 최대 5개를 선택한다.
  2. 희망 시급을 증감 UI 없이 직접 입력한다.
  3. 저장 시 A hook이 camelCase patch를 snake_case row로 변환해 upsert한다.
  4. 저장 성공 후 query cache에 서버 반환값을 넣는다.
  5. 사업자 지원자 상세에서도 같은 MBTI와 키워드가 읽기 전용으로 보인다.
  </flow>

  <flow id="F4" name="중복 지원 방지">
  1. 상세 카드 또는 지원 route가 기존 지원 여부를 조회한다.
  2. 이미 지원했으면 form 진입을 막고 `지원 완료`와 상세 보기만 제공한다.
  3. 미지원이면 사용자가 메시지를 제출한다.
  4. DB insert와 unique constraint가 최종 원자성을 보장한다.
  5. concurrent submit으로 `23505`가 나도 기존 지원서를 수정하지 않고 완료 상태로 수렴한다.
  </flow>

  <flow id="F5" name="지원 상세 확인">
  1. 설정 → 지원 현황에서 행을 선택한다.
  2. 지원 단건, 공고, 리뷰를 불러온다.
  3. 사용자는 자신이 보낸 메시지, 상태, 지원일, 가게와 근무 조건 전체를 확인한다.
  4. 상세 화면에는 재지원 또는 메시지 수정 CTA가 없다.
  </flow>

  <flow id="F6" name="홈 카드 탭 상세">
  1. 맨 위 카드의 pointer interaction을 탭 또는 드래그로 단일 판정한다.
  2. 탭이면 swipe mutation 없이 ExpandedCard를 연다.
  3. 상세 중 모든 덱 입력을 잠근다.
  4. 닫으면 같은 카드와 덱 순서를 복원한다.
  </flow>

  <flow id="F7" name="인앱 알림">
  1. 지원서 insert 또는 상태 update가 DB trigger를 실행한다.
  2. trigger는 권한 있는 recipient에게 deduplicated notification을 생성한다.
  3. TopBar badge가 polling 또는 focus refetch로 unread 수를 갱신한다.
  4. 사용자가 알림을 열고 관련 화면으로 이동하면 읽음 처리한다.
  5. type과 payload는 후속 알림 종류 추가 시 기존 테이블과 UI shell을 재사용한다.
  </flow>
</core_functionality>

<error_handling>
  <storage_errors>
  - localStorage 접근 실패 시 튜토리얼을 현재 세션에서 표시한다.
  - 기록 쓰기 실패가 닫기 동작을 막지 않는다.
  </storage_errors>

  <application_errors>
  - `ALREADY_APPLIED`: error toast 대신 정보 toast와 지원 완료 화면.
  - network 또는 Supabase 일반 오류: form 값 유지, error toast, 재시도 허용.
  - 지원 여부 조회 실패: 지원 CTA를 활성화하지 않고 `지원 여부를 확인하지 못했어요`와 retry 제공. 중복 가능 상태에서 낙관 제출하지 않는다.
  - 지원 상세 0건: 권한 없음과 존재하지 않음을 구분하지 않는 공통 not-found UI.
  </application_errors>

  <profile_errors>
  - MBTI 허용값 위반, 키워드 6개 이상, 시급 음수 또는 1,000,000 초과는 client validation 후 field error.
  - DB constraint가 실패하면 generic save error와 입력 유지. raw Supabase 메시지를 사용자에게 노출하지 않는다.
  </profile_errors>

  <notification_errors>
  - unread count 실패 시 badge만 숨기고 앱 탐색은 유지한다.
  - 목록 실패 시 error state와 retry.
  - 읽음 mutation 실패 시 낙관 상태 rollback과 `읽음 처리하지 못했어요` toast.
  - 알림의 연결 대상이 삭제됐으면 알림은 읽음 처리 후 `관련 내용을 찾을 수 없어요` toast를 보여주고 목록에 머문다.
  </notification_errors>

  <gesture_errors>
  - pointer cancel은 탭으로 처리하지 않고 x를 0으로 복귀한다.
  - multi-touch는 첫 pointer만 추적하고 나머지는 무시한다.
  - image dragstart는 방지하며 브라우저 scroll과 card drag가 동시에 일어나지 않게 `touch-action: none`을 유지한다.
  </gesture_errors>
</error_handling>

<regression_risks>
  <risk name="튜토리얼 반복 또는 누락">
  - route 이동마다 다시 뜨거나 기존 global key 때문에 신규 계정에 안 뜰 수 있다.
  - 사용자 A 닫기 → 로그아웃 → 사용자 B 신규 가입 → B에는 표시 → B 재로그인 → 미표시 순서로 검증한다.
  </risk>

  <risk name="지원 메시지 덮어쓰기">
  - 기존 upsert가 남아 있으면 두 번째 제출이 성공하며 message가 바뀐다.
  - 첫 message 저장 후 두 번째 다른 message 제출을 시도하고 DB의 원문과 `created_at`이 그대로인지 검증한다.
  </risk>

  <risk name="지원 여부 race">
  - query loading 중 CTA가 활성화되면 중복 제출 화면이 보일 수 있다.
  - 느린 네트워크에서 확인 중 CTA disabled와 `23505` 수렴을 검증한다.
  </risk>

  <risk name="카드 상세와 스와이프 이중 실행">
  - 한 gesture가 상세와 swipe를 둘 다 발생시키거나 뒤 카드가 열릴 수 있다.
  - 탭, 9px 이동, 왕복 이동, 빠른 flick, 500ms long press를 각각 실기기에서 검증한다.
  </risk>

  <risk name="중복 layoutId">
  - 상세 open 중 원본 카드가 DOM에 남으면 확대 애니메이션이 형제 카드를 관통한다.
  - React DevTools 또는 DOM 검사로 동일 layoutId 주체가 한 개뿐인지 확인한다.
  </risk>

  <risk name="설정 route 회귀">
  - `/me` bookmark와 role guard가 redirect loop를 만들 수 있다.
  - seeker와 employer 각각 `/me`, `/settings`, `/settings/profile`, `/wishlist` 직접 진입을 검증한다.
  </risk>

  <risk name="RLS 데이터 노출">
  - notification과 application 단건 조회에서 다른 사용자 ID를 넣어 타인의 내용을 볼 수 있다.
  - 두 계정의 JWT로 상호 ID 조회가 0건인지 SQL 및 REST로 검증한다.
  </risk>

  <risk name="알림 중복">
  - 상태를 같은 값으로 재저장하거나 mutation 재시도 시 같은 알림이 여러 개 생길 수 있다.
  - dedupe key unique와 OLD/NEW 비교를 SQL로 검증한다.
  </risk>

  <risk name="프로필 하위 호환">
  - migration 전후 null 및 empty array 처리 누락으로 기존 사용자의 profile mapper가 실패할 수 있다.
  - 기존 프로필 행, 프로필 없는 사용자, 새 프로필 행 세 경우를 검증한다.
  </risk>
</regression_risks>

<migration_plan>
  <pre_deploy>
  1. Supabase SQL Editor에서 `schema_phase3_ux.sql` 전체 실행.
  2. column, constraint, table, index, trigger, RLS policy 존재 확인.
  3. 기존 구직자 프로필 조회와 기존 지원 목록 조회가 그대로 되는지 확인.
  4. `select count(*) from jobs where employer_id is null`을 실행하고 데모 대상 공고의 owner가 반드시 배정됐는지 확인. owner가 없으면 사업자 알림 recipient를 정할 수 없다.
  5. 테스트 구직자와 사업자로 지원 생성 및 상태 변경 후 notification 행 생성 확인.
  </pre_deploy>

  <compatibility>
  - 새 프로필 컬럼은 nullable 또는 default가 있어 구버전 앱과 호환된다.
  - notifications는 새 테이블이라 구버전 앱에 영향이 없다.
  - API의 upsert → insert 변경은 새 UI의 기존 지원 여부 확인과 같은 배포에 포함한다.
  - DB migration 후 앱 배포 전 짧은 구간에도 기존 앱은 중복 지원을 계속 upsert할 수 있다. 기능 freeze 동안 migration 직후 앱을 연속 배포한다.
  </compatibility>

  <rollback>
  - 앱 문제 시 Vercel에서 `ae4b192` 배포로 rollback 가능하다. additive DB 컬럼과 테이블은 즉시 삭제하지 않아도 구버전 앱에 영향이 없다.
  - trigger가 잘못된 알림을 만들면 application data를 건드리지 말고 trigger 두 개만 disable 또는 drop한다.
  - notification 데이터 삭제는 사용자 승인 없는 rollback 절차에 포함하지 않는다.
  - 프로필 새 컬럼 drop은 데이터 손실이므로 rollback하지 않고 unused 상태로 둔다.
  </rollback>
</migration_plan>

<final_integration_test>
  <test_scenario_1>
  <description>같은 브라우저의 신규 계정별 튜토리얼</description>
  <steps>
  1. localStorage의 legacy key와 v2 test keys를 지운다.
  2. 구직자 A를 신규 가입하고 홈 진입 즉시 4장 튜토리얼이 보이는지 확인한다.
  3. 2장까지 진행한 후 X로 닫고 홈 카드가 조작 가능한지 확인한다.
  4. 다른 route로 이동 후 홈으로 돌아와 자동 재표시되지 않는지 확인한다.
  5. 로그아웃 후 같은 브라우저에서 구직자 B를 신규 가입한다.
  6. B에게 튜토리얼이 표시되는지 확인한다.
  7. 설정의 `튜토리얼 다시 보기`로 즉시 열리는지 확인한다.
  8. 사업자 신규 가입에서는 자동 표시되지 않는지 확인한다.
  </steps>
  </test_scenario_1>

  <test_scenario_2>
  <description>설정 탭과 하위 route</description>
  <steps>
  1. 구직자로 로그인해 하단 세 번째 탭이 `설정`인지 확인한다.
  2. 설정에서 내 정보 수정, 지원 현황, 찜한 가게 메뉴가 모두 보이는지 확인한다.
  3. 각 메뉴를 열고 top bar 제목과 뒤로가기가 정확한지 확인한다.
  4. `/me` 직접 진입이 `/settings/profile`로 replace되는지 확인한다.
  5. `/settings/applications`를 새로고침해 세션 복구 뒤 목록이 유지되는지 확인한다.
  6. 사업자로 로그인해 세 번째 탭이 설정인지 확인한다.
  7. 사업자가 `/settings/profile`에 직접 접근할 때 역할 기본 화면으로 안전하게 redirect되는지 확인한다.
  8. 로그아웃 confirm과 스와이프 초기화 confirm이 기존대로 동작하는지 확인한다.
  </steps>
  </test_scenario_2>

  <test_scenario_3>
  <description>MBTI, 성격 키워드, 희망 시급 저장</description>
  <steps>
  1. 기존 프로필 사용자의 내 정보 수정 화면을 연다.
  2. MBTI `ENFP`와 키워드 5개를 선택한다.
  3. 여섯 번째 미선택 키워드가 disabled인지 확인한다.
  4. 희망 시급 입력에 증감 화살표가 없는지 Chrome, Safari에서 확인한다.
  5. `12,500` 또는 `12500`을 입력해 저장하고 성공 toast를 확인한다.
  6. 새로고침 후 값이 동일하게 복구되는지 확인한다.
  7. 음수와 1,000,001 입력이 field error로 막히는지 확인한다.
  8. 사업자 지원자 상세에서 MBTI와 선택 키워드가 읽기 전용으로 보이는지 확인한다.
  </steps>
  </test_scenario_3>

  <test_scenario_4>
  <description>단일 지원과 중복 차단</description>
  <steps>
  1. 미지원 공고 상세에서 `지원하기`를 눌러 message A로 제출한다.
  2. 완료 화면에 `지원 완료`와 `지원 내용 보기`가 보이는지 확인한다.
  3. 같은 공고 상세를 다시 열어 지원 CTA가 disabled 완료 상태인지 확인한다.
  4. `/apply/:jobId`를 직접 열어 form이 다시 나오지 않는지 확인한다.
  5. 두 브라우저 탭에서 동일 계정과 공고로 동시 제출을 시도한다.
  6. applications 행이 1개뿐인지 SQL로 확인한다.
  7. 최초 message와 `created_at`이 두 번째 시도로 바뀌지 않았는지 확인한다.
  8. 사용자에게 raw `23505` 오류가 노출되지 않는지 확인한다.
  </steps>
  </test_scenario_4>

  <test_scenario_5>
  <description>지원 현황과 지원 상세</description>
  <steps>
  1. 설정에서 지원 현황을 열고 방금 지원한 가게 행을 찾는다.
  2. 행 전체를 탭해 지원 상세로 이동한다.
  3. status, 지원일, 내가 보낸 message가 일치하는지 확인한다.
  4. 시급, 근무 요일, 시간, 주소, benefits, 공고 설명이 보이는지 확인한다.
  5. 리뷰가 있으면 최대 3개, 없으면 빈 문구가 보이는지 확인한다.
  6. 상세에 재지원 또는 메시지 수정 버튼이 없는지 확인한다.
  7. 상세 URL을 복사해 새로고침해도 데이터가 복구되는지 확인한다.
  8. 다른 사용자 application id로 접근하면 not-found UI인지 확인한다.
  </steps>
  </test_scenario_5>

  <test_scenario_6>
  <description>홈 카드 탭과 swipe 배타성</description>
  <steps>
  1. Android Chrome에서 카드 이미지 중앙을 짧게 탭해 상세가 열리는지 확인한다.
  2. 닫은 뒤 카드 텍스트와 빈 영역도 각각 탭해 상세가 열리는지 확인한다.
  3. 상세 중 ArrowLeft, ArrowRight, 하단 swipe button, drag가 동작하지 않는지 확인한다.
  4. X로 닫고 같은 카드가 맨 위에 그대로인지 확인한다.
  5. 9px 이상 천천히 움직였다 놓아 상세가 열리지 않는지 확인한다.
  6. 빠른 flick가 한 번만 swipe되고 상세는 열리지 않는지 확인한다.
  7. 20px 갔다 제자리로 돌아온 gesture가 탭으로 오인되지 않는지 확인한다.
  8. iOS Safari에서 1–7을 반복하고 카드 겹침과 화면 가로 scroll이 없는지 확인한다.
  </steps>
  </test_scenario_6>

  <test_scenario_7>
  <description>알림 생성, 읽음, 연결 이동</description>
  <steps>
  1. 구직자가 사업자 소유 공고에 지원한다.
  2. 사업자 알림 badge가 30초 이내 또는 창 focus 시 1 증가하는지 확인한다.
  3. 사업자 알림 목록에서 지원 접수 내용과 가게명을 확인한다.
  4. 알림을 탭해 지원자 화면으로 이동하고 unread가 1 감소하는지 확인한다.
  5. 사업자가 지원 상태를 accepted로 변경한다.
  6. 구직자 알림 badge와 목록에 채용 확정 알림이 생기는지 확인한다.
  7. 같은 accepted update를 다시 실행해 중복 알림이 생기지 않는지 확인한다.
  8. 모두 읽음을 누르고 badge가 사라지며 새로고침 후에도 read 상태인지 확인한다.
  </steps>
  </test_scenario_7>

  <test_scenario_8>
  <description>RLS와 빌드 회귀</description>
  <steps>
  1. 사용자 A JWT로 사용자 B notification id를 select하고 0건인지 확인한다.
  2. A가 B notification read_at을 update할 수 없는지 확인한다.
  3. seeker가 임의 notification insert를 할 수 없는지 확인한다.
  4. employer가 자기 공고가 아닌 application 상태를 update할 수 없는지 확인한다.
  5. `npm run lint`를 실행해 error 0인지 확인한다.
  6. `npm run build`를 실행해 TypeScript와 Vite build가 통과하는지 확인한다.
  7. ownership verify script가 있으면 실행해 소유권, hex, layout 제약을 확인한다.
  8. Vercel 배포 후 `/`, `/settings/profile`, `/settings/applications`, `/notifications` deep link가 모두 HTTP 200인지 확인한다.
  </steps>
  </test_scenario_8>
</final_integration_test>

<success_criteria>
  <functionality>
  - 같은 브라우저에서도 신규 구직자 계정마다 첫 홈 진입 튜토리얼 표시율 100%.
  - 동일 `(user_id, job_id)` applications 행 수 최대 1개, 두 번째 제출로 기존 message 변경 0건.
  - 지원 현황 모든 행이 상세로 이동하고 제출 message 및 공고 필드를 완전 표시.
  - MBTI 0 또는 1개, 성격 키워드 0–5개가 저장과 재조회에서 동일.
  - 모든 인증 주 화면에서 알림 badge와 목록 접근 가능.
  - application insert와 상태 변경 알림이 각 이벤트당 정확히 1건.
  </functionality>

  <user_experience>
  - 희망 시급 control에 브라우저 기본 증감 화살표 0개.
  - 홈 카드 유효 탭 20회 중 상세 open 20회, swipe 동시 실행 0회.
  - 카드 swipe 20회 중 상세 오픈 오탐 0회.
  - 모든 interactive target 최소 44px, 320px 폭에서 가로 overflow 0.
  - 알림 목록과 지원 목록에 loading, empty, error 상태가 모두 존재.
  </user_experience>

  <technical_quality>
  - Supabase 호출의 error check 누락 0건.
  - B 소유 UI에서 Supabase direct import 0건.
  - 동일 `layoutId` 동시 mount 0건.
  - 새 컴포넌트 hex 리터럴, `color-mix()`, `100vh`, `dangerouslySetInnerHTML` 사용 0건.
  - 다른 사용자의 profile, application, notification 조회 성공 0건.
  - `npm run lint`와 `npm run build` 모두 exit code 0.
  </technical_quality>

  <parallel_delivery>
  - `src/types.ts` 외 A/B 동시 수정 파일 0개.
  - A contract commit 이후 각 작업자가 자신의 소유 파일만 commit.
  - merge conflict 0건을 목표로 하며 conflict 발생 시 해당 파일 소유자가 최종 해소.
  </parallel_delivery>
</success_criteria>

<implementation_order>
  <phase number="0" owner="통합자" name="기준선 고정">
  1. `main` 최신 pull과 clean worktree 확인.
  2. 브랜치 `a/ux-data-notifications`, `b/ux-settings-interactions`를 같은 commit에서 생성.
  3. 현재 DB의 Phase 2 table과 RLS, employer_id 배정 여부를 읽기 전용으로 재확인.
  </phase>

  <phase number="1" owner="A" name="공동 타입 계약">
  1. `src/types.ts`에 MBTI, 성격 키워드, notification 타입만 추가.
  2. `npm run build`로 기존 코드 호환 확인.
  3. 이 파일만 `contract: 프로필 성향과 알림 타입 추가`로 commit 및 push.
  4. B에게 commit hash를 전달한다.
  </phase>

  <phase number="2A" owner="A" name="DB와 데이터 계층">
  1. `schema_phase3_ux.sql` 작성과 staging DB 적용.
  2. profile mapper와 save patch 확장.
  3. applications API를 insert 기반으로 변경하고 중복 error contract 추가.
  4. application by-job, detail fetch와 hook 추가.
  5. notification API와 hook 추가.
  6. SQL 검증, lint, build 후 `a/ux-data-notifications` push.
  </phase>

  <phase number="2B" owner="B" name="독립 UI 안정화">
  1. A contract commit을 rebase한다.
  2. 사용자별 tutorial key, remount, storage failure 동작을 수정한다.
  3. 홈 카드 탭 상세를 실기기에서 재현하고 tap/swipe 배타성을 수정한다.
  4. BottomTabBar, SettingsPage, router를 설정 구조로 변경하고 `/me` 호환 redirect를 추가한다.
  5. ProfileEditor에 MBTI, 키워드, text numeric wage input을 추가한다.
  6. 지원 현황, 지원 상세, 알림 page와 UI component를 만든다.
  7. 이 단계에서는 hook signature를 문서 계약대로 연결하되 A 파일을 수정하지 않는다.
  8. lint와 build 후 `b/ux-settings-interactions` push.
  </phase>

  <phase number="3" owner="통합자" name="통합">
  1. A branch를 integration branch에 먼저 merge한다.
  2. B branch를 merge하고 hook return type 연결 오류만 해당 소유자에게 수정 요청한다.
  3. DB migration이 production에 적용됐는지 확인한 뒤 앱을 배포한다.
  4. final integration scenarios 1–8을 순서대로 실행한다.
  5. `npm run lint`, `npm run build`, ownership verify를 모두 통과한 뒤 `main`에 merge한다.
  </phase>

  <phase number="4" owner="통합자" name="배포 확인">
  1. Vercel latest bundle 반영과 deep links HTTP 200 확인.
  2. 실제 구직자와 사업자 계정으로 알림 end-to-end 확인.
  3. 실패 시 앱은 직전 Vercel deployment로 rollback하고 additive DB schema는 유지한다.
  4. `_handoff/PROGRESS.md` 맨 아래에 commit, migration, 검증 결과를 기록한다.
  </phase>
</implementation_order>
</feature_specification>
