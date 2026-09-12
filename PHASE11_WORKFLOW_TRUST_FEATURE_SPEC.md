<feature_specification>
  <feature_name>AlbaSwipe Phase 11 — 폼·지원 상태·매칭 연락처·튜토리얼·알림 가독성 개선</feature_name>

  <overview>
    이번 단계는 신규 기능을 넓히는 작업이 아니라, 사용자가 실제 흐름에서 오해하거나 막히는 지점을 제거하는 신뢰성 개선이다. 공고 작성 오류 위치 자동 이동, 필수 항목 표시, 최저시급 이중 검증, 지원 상태 문구 정리, 목록 구분 강화가 폼과 상태 인지를 담당한다.

    구인자는 지원자를 별점과 복수 사유로 평가하고, 기존의 과도한 “채용” 표현 대신 “관심”을 보낸다. 구직자와 구인자가 서로 관심을 표시해 매칭되면 이메일과 전화번호를 함께 확인하고 각각 메일 앱과 전화 앱으로 이동할 수 있다.

    구직자 공고 상세 하단은 “지원하기”와 “찜”을 나란히 제공한다. 상세 화면에서 찜을 눌러도 현재 공고가 사라지지 않도록 단건 공고 쿼리를 도입하며, 기존 스와이프·찜 캐시 계약은 유지한다.

    구인자 튜토리얼은 빈 지원자 화면과 안내 카드가 동시에 강조되고 닫기 버튼이 헤더 알림 아이콘과 겹치는 문제를 제거한다. 알림 목록은 역할과 무관하게 왼쪽의 명확한 빨간 미읽음 점, 알림 종류 라벨, 공고 이미지 또는 종류별 색상 아이콘을 함께 사용해 제목을 읽기 전에도 내용을 구분할 수 있게 한다.

    CRITICAL: 백엔드 서버가 없으므로 Supabase PostgreSQL, Auth, RLS, security definer RPC가 유일한 보안 경계다. 전화번호는 상호 매칭이 확인된 상대에게만 공개하며 클라이언트 필터를 보안 수단으로 사용하지 않는다.
  </overview>

  <assumptions>
    - 전화번호 필수 여부: 신규 가입자는 전화번호 입력을 필수로 한다. 이유는 매칭 시 이메일과 전화번호를 모두 제공하려는 요구를 안정적으로 만족하기 위해서다. 기존 계정은 전화번호가 없을 수 있으므로 nullable 하위 호환을 유지한다.
    - 전화번호 범위: 대한민국 휴대전화 번호만 지원하며 입력은 `01012345678`, `010-1234-5678`을 모두 받고 저장은 숫자 11자리, 표시는 `010-1234-5678`로 통일한다. 해외 번호가 필요해지면 E.164 모델로 별도 확장한다.
    - 평가 사유: 최대 3개까지 복수 선택한다. 너무 많은 선택은 평가 의미를 희석하고 모바일 높이를 키우므로 제한한다.
    - “기타” 사유: `other` 선택 시 2~100자의 직접 입력이 필수다. `other`를 해제하면 입력값도 제거한다.
    - “구직자의 내 공고” 표현: 구직자에게 `/employer/jobs`에 대응하는 화면은 없다. 의도한 목록 구분 요구를 빠뜨리지 않도록 구인자 지원자 목록, 구인자 내 공고, 구직자 지원 현황 세 목록에 동일한 왼쪽 구분 바 패턴을 적용한다.
    - `applications.status = accepted`: DB enum과 기존 행은 유지하되 사용자 노출 의미만 `관심 보냄`으로 바꾼다. enum rename은 모든 알림·쿼리·기존 데이터 마이그레이션 위험이 더 크다.
    - 2026년 최저시급은 현재 코드와 고용노동부 고시 기준 `10_320`원이다. 연도가 바뀌면 단일 상수와 DB CHECK를 함께 갱신해야 한다.
    - 알림의 “안 읽음”은 목록에 노출됐다는 뜻이 아니라 사용자가 해당 행을 눌러 유효한 상세 화면 또는 매칭 시트를 연 적이 없다는 뜻이다.
    - 알림 썸네일: 연결된 공고의 `imageUrl`이 있으면 이를 우선 사용한다. 이미지가 없거나 로드에 실패하면 알림 종류별 색상 아이콘 타일로 대체하며 외부 placeholder 서비스는 사용하지 않는다.
  </assumptions>

  <open_questions>
    현재 구현을 막는 질문 없음. 위 assumptions가 제품 의도와 다르면 구현 전에 해당 항목만 수정한다.
  </open_questions>

  <existing_codebase_context>
    <stack>React 19.3.0 + TypeScript 5.9.3 + Vite 8.3.0 + React Router 7.18.3 + TanStack Query 5.102.8 + Supabase JS 2.116.0 + Tailwind CSS 4.3.3 + Motion 13.2.0 — package.json 실측</stack>
    <baseline>`main` = `12ee485`, Phase 10 DB 점검 기준 jobs 152건, ownerless 0, region 누락 0, 추천 샘플 88건. 이후 main에서 보류 탭 제거와 내 공고 실시간 수정까지 반영됨.</baseline>
    <conventions>
      - 서버 상태는 TanStack Query, 로컬 UI 상태는 React `useState`; 새 전역 상태 라이브러리 금지.
      - Supabase 직접 호출은 `src/lib/api/*` 또는 승인된 전용 훅에만 둔다. 모든 호출 뒤 `if (error) throw error` 필수.
      - 화면은 훅만 사용하고 snake_case DB 필드를 직접 읽지 않는다.
      - 색은 `src/styles/globals.css`의 semantic token만 사용한다. 컴포넌트 hex 리터럴 금지.
      - 그림자 금지, 1px hairline으로 구분. 글자 최대 18px/600, 터치 타겟 최소 44×44px.
      - 모션 120ms 피드백, 200ms 전환. `prefers-reduced-motion`이면 즉시 이동.
      - `100vh` 금지, `100dvh` 사용. 입력 폰트 16px 이상.
      - 새 의존성 없음. 기존 React, Motion, lucide-react만 사용.
    </conventions>
    <relevant_modules>
      - `src/pages/EmployerJobFormPage.tsx`: 공고 작성, 검증, 2026 최저시급 상수와 필수 필드.
      - `src/features/auth/form-primitives.tsx`: Signup과 공고 폼이 쓰는 `Field`, `TextareaField`, `Checkbox`.
      - `src/pages/SignupPage.tsx`, `src/lib/auth-context.tsx`: 가입 데이터와 Supabase Auth metadata.
      - `src/features/employer-ui/ApplicantCard.tsx`: 현재 1초 노출만으로 `viewed` 처리하는 로직.
      - `src/features/employer-ui/ApplicantDetail.tsx`, `SeekerRating.tsx`: 상태 CTA와 별점 입력.
      - `src/lib/api/ratings.ts`, `src/hooks/useSeekerRating.ts`, `seeker_ratings`: 평가 저장 계약.
      - `src/features/notifications/MatchSheet.tsx`, `src/hooks/useMatchedContact.ts`, `matched_contact()`: 매칭 연락처.
      - `src/pages/JobDetailPage.tsx`, `src/features/wishlist/BackFace.tsx`: 전체 화면 공고 상세와 하단 CTA.
      - `src/pages/EmployerJobsPage.tsx`, `src/pages/MyApplicationsPage.tsx`: 목록 구분 강화 대상.
      - `src/features/apply/applicationPresentation.ts`, `src/features/employer-ui/applicationPresentation.ts`: 역할별 상태 문구.
      - `src/features/onboarding/InteractiveTutorial.tsx`, `employerSteps.ts`, `useAnchorRect.ts`: 구인자 스포트라이트와 안내 카드 배치.
      - `src/features/notifications/NotificationList.tsx`, `src/pages/NotificationsPage.tsx`: 현재 제목 안쪽 6px 검은 미읽음 점과 단색 아이콘을 사용하는 알림 목록.
      - `src/lib/api/notifications.ts`: 이미 `read_at`과 `jobs.image_url`을 조회하므로 신규 DB 필드 없이 알림 시각 계층을 강화할 수 있다.
    </relevant_modules>
    <reuse_do_not_reinvent>
      - 토스트는 `useToast()`, 버튼은 `Button`, 배지는 `Badge`, 체크 UI는 기존 `Checkbox`를 확장한다.
      - 찜 저장은 `useDeck().swipe(jobId, 'right')`, 해제는 `useWishlist().remove(jobId)`를 재사용한다.
      - 매칭 판정은 기존 `offers`와 `on_offer_right()` trigger를 재사용한다. 별도 match 테이블을 만들지 않는다.
      - 전화번호 공개는 기존 `matched_contact` 보안 원리를 복제한 `matched_contact_v2`에서만 수행한다.
      - 상태 enum `applied|viewed|accepted|rejected`는 유지한다. 표시 문구만 presentation 모듈에서 바꾼다.
      - 폼 스크롤은 브라우저 `scrollIntoView`를 사용한다. 새 스크롤 라이브러리 금지.
      - 알림 읽음 저장과 낙관적 캐시는 기존 `useNotifications()`를 유지한다. 목록 노출만으로 읽음 처리하지 않는다.
    </reuse_do_not_reinvent>
    <ownership_rules>
      - A 전용: `src/lib/`, `src/hooks/`, `src/features/auth/`, `supabase/`, `src/pages/SignupPage.tsx`, `src/pages/EmployerJobFormPage.tsx`, `src/pages/EmployerJobsPage.tsx`.
      - B 전용: `src/components/`, `src/styles/`, `src/features/employer-ui/`, `src/features/employer-deck/`, `src/features/notifications/`, `src/features/onboarding/`, `src/features/apply/`, `src/features/wishlist/`, `src/pages/JobDetailPage.tsx`, `src/pages/EmployerApplicantsPage.tsx`, `src/pages/MyApplicationsPage.tsx`, `src/pages/NotificationsPage.tsx`.
      - 공동 계약 `src/types.ts`: A가 `contract:` 단독 커밋으로만 수정하고 다른 파일과 섞지 않는다.
      - CRITICAL: 아래 할당표에서 상대 소유 파일을 수정하지 않는다. 필요한 계약은 integration_points의 타입으로만 연결한다.
    </ownership_rules>
  </existing_codebase_context>

  <scope_boundaries>
    <in_scope>
      - 공고 작성 제출 실패 시 첫 오류 필드로 smooth scroll + focus.
      - 모든 실제 필수 입력·선택·동의 라벨 옆 `*`와 스크린리더용 “필수” 텍스트.
      - 구인 공고 시급의 UI 검증과 DB CHECK 모두 10,320원 이상.
      - 평가 점수 + 최대 3개 복수 사유 + 기타 직접 입력.
      - `채용` 사용자 문구를 `관심 보내기/관심 보냄/관심을 보냈어요`로 전환.
      - 지원자 읽지 않음/읽음/관심 보냄/거절 상태를 서로 다른 배지 색으로 표시.
      - 세 목록 행에 위아래 여백이 있는 왼쪽 3px 구분 바.
      - 가입 전화번호 필수 입력과 상호 매칭 후 이메일·전화번호 공개.
      - 공고 상세 하단 지원 CTA 오른쪽 찜 토글.
      - 구인자 튜토리얼의 헤더·빈 상태·지원자 카드와 겹치는 시각 경쟁 제거 및 모든 단계의 즉시 보이는 다음 CTA.
      - 양 역할 알림 목록의 왼쪽 빨간 미읽음 점, 종류 라벨, 공고 썸네일/색상 아이콘 fallback.
    </in_scope>
    <out_of_scope>
      - SMS 인증, OTP, 전화번호 로그인, 국제 전화번호.
      - 실시간 채팅, 문자 자동 발송, 외부 CRM 연동.
      - 평가 사유 통계·랭킹·추천 알고리즘 반영.
      - `accepted` DB 값의 물리적 rename 또는 기존 applications 행 재작성.
      - 공고 수정/삭제 기능.
      - 네이티브 앱 또는 별도 백엔드 서버.
      - 알림 그룹 탭, 검색, 삭제, OS push 및 새 알림 종류 추가.
    </out_of_scope>
    <future_considerations>
      - Phase 12: 본인 인증된 전화번호와 SMS 연락.
      - Phase 12: 평가 사유 집계 후 구직자에게 건설적인 피드백 제공.
      - Phase 13: 공고별 지원 파이프라인과 면접 일정.
    </future_considerations>
  </scope_boundaries>

  <data_model_changes>
    <change entity="user_contacts">
      - ADD table `user_contacts`.
      - `user_id`: uuid, primary key, FK `auth.users(id) on delete cascade`, default `auth.uid()`.
      - `phone`: text, required, CHECK `^010[0-9]{8}$`.
      - `updated_at`: timestamptz, required, default `now()`.
      - RLS: 본인 SELECT/INSERT/UPDATE만 허용. 다른 사용자의 직접 SELECT 금지.
      - GRANT: authenticated에 SELECT/INSERT/UPDATE. anon 권한 없음.
      - Auth 가입 trigger: `raw_user_meta_data.phone`을 정규화해 행 생성. 형식이 틀리면 가입 자체를 실패시켜 연락처 없는 신규 계정을 만들지 않는다.
    </change>
    <change entity="seeker_ratings">
      - ADD `reason_codes text[] not null default '{}'`.
      - ADD `reason_other text null`.
      - CHECK: `reason_codes` 원소는 `reliable|relevant_experience|communication|schedule_fit|friendly|quick_learner|teamwork|other`만 허용.
      - CHECK: 중복 제거 후 1~3개. `other` 포함 시 `btrim(reason_other)` 길이 2~100, 미포함 시 `reason_other is null`.
      - 기존 행은 `reason_codes = '{}'`로 유지해 마이그레이션 호환성을 보장한다. 수정 저장 시부터 새 검증을 적용한다.
    </change>
    <change entity="jobs">
      - ADD named CHECK `jobs_hourly_wage_min_2026`: `hourly_wage &gt;= 10320`.
      - 마이그레이션 전 `select count(*) where hourly_wage &lt; 10320`이 0인지 확인한다. Phase 10 점검에서는 0이었다.
    </change>
    <contract_changes>
      - `PhoneContact = { email: string | null; phone: string | null }`.
      - `RatingReasonCode = 'reliable' | 'relevant_experience' | 'communication' | 'schedule_fit' | 'friendly' | 'quick_learner' | 'teamwork' | 'other'`.
      - `RatingInput = { score: 1|2|3|4|5; reasons: RatingReasonCode[]; otherReason: string | null }`.
      - `AuthUser.phone?: string | null`; 기존 사용자와 구버전 세션을 위해 optional.
      - `ApplicationStatus`는 변경하지 않는다.
    </contract_changes>
  </data_model_changes>

  <api_changes>
    <added>
      <rpc name="matched_contact_v2(counterpart uuid)">
        - 반환: jsonb `{ "email": string|null, "phone": string|null }` 또는 권한 없을 때 null.
        - 보안: `security definer`, `set search_path = public`, authenticated만 execute.
        - 조건: 호출자와 counterpart 사이 `offers.direction = 'right'`가 양방향 모두 존재할 때만 반환.
        - CRITICAL: 한쪽 offer만 있거나 상대 id가 틀리면 이메일과 전화번호 모두 null. 실패 이유를 구분하지 않는다.
        - 기존 `matched_contact()` text RPC는 구버전 앱을 위해 삭제하지 않는다.
      </rpc>
      <rpc name="rate_seeker_with_reasons">
        - 인자: `seeker uuid`, `score integer`, `reason_codes text[]`, `reason_other text`.
        - 검증: 호출자가 employer이고 해당 seeker가 호출자 소유 공고에 지원했는지 확인.
        - 동작: `seeker_ratings`를 `(employer_id,seeker_id)` 기준 upsert.
        - 오류: score 범위, reason enum, 개수, other 길이를 DB에서 재검사.
      </rpc>
    </added>
    <modified>
      - `signUp(args)`: `phone` 추가. Supabase Auth metadata에 숫자 11자리로 전달한다.
      - `fetchMatchedContact`: `matched_contact_v2`를 호출하고 `PhoneContact|null`로 매핑한다.
      - `rateSeeker`: 문자열 comment 대신 `RatingInput`을 받아 RPC 한 번으로 원자 저장한다.
      - `fetchSeekerRatings`: `reason_codes`, `reason_other`를 매핑하되 다른 평가자의 사유를 UI에 노출하지 않는다.
      - `fetchJob(jobId)`: 단건 jobs 조회, query key `['job', jobId]`; RLS public read 사용.
      - `setApplicationStatus(id, 'accepted')`: DB trigger가 같은 employer/seeker/job의 offers를 right로 upsert하도록 마이그레이션한다.
    </modified>
  </api_changes>

  <ui_changes>
    <modified_view name="공고 작성 /employer/jobs/new">
      - 필수: 가게 이름, 업종, 시급, 한 줄 요약, 주소, 근무 요일, 시작/종료 시간.
      - 선택: 복리후생, 원하는 성격, 사진, 상세 내용.
      - 필수 라벨 텍스트 바로 오른쪽에 red `*`; 색만으로 의미를 전달하지 않도록 sr-only “필수” 병기.
      - 시급 아래 상시 hint: `2026년 최저시급 10,320원 이상`.
      - blur 및 submit에서 10,320원 미만이면 inline error. 빈 값은 “시급을 입력해 주세요”, 숫자지만 미달이면 최저시급 문구로 구분.
      - submit 오류 순서: storeName → category → hourlyWage → summary → address → workDays → workHours.
      - 첫 오류 wrapper로 `scrollIntoView({behavior:'smooth', block:'center'})`, 200ms 후 해당 input/select/button group focus.
      - reduced motion이면 `behavior:'auto'`; 오류 필드는 `aria-invalid=true`, 에러 id를 `aria-describedby`로 연결.
      - 스크롤 중 레이아웃/높이 애니메이션 금지. 기존 값은 보존한다.
    </modified_view>

    <modified_view name="회원가입 /signup">
      - 1단계 필수 라벨: 역할, 닉네임, 이메일, 전화번호, 비밀번호, 비밀번호 확인.
      - 전화번호 입력은 `type=tel`, `inputMode=tel`, `autoComplete=tel`, placeholder `010-1234-5678`.
      - 입력 중 숫자 외 문자를 제거하지 말고 하이픈을 허용한다. 검증 시 숫자만 추출해 11자리와 `010` 시작을 확인한다.
      - 에러 문구: 빈 값 `전화번호를 입력해 주세요`; 형식 오류 `010으로 시작하는 휴대전화 번호를 입력해 주세요`.
      - 2단계 필수 동의만 `*`; 맞춤 추천 수신 동의는 선택이므로 별표 없음.
      - 개인정보 설명에 `전화번호`와 `상호 매칭 후 상대에게 공개`를 명시.
      - 구인자 역할 설명의 “채용합니다”를 `관심 있는 지원자와 매칭합니다`로 변경.
      - 단계 submit 오류 시 해당 단계의 첫 오류로 자동 스크롤·focus. 다른 단계로 강제 이동하지 않는다.
    </modified_view>

    <modified_view name="지원자 상세">
      - 기존 별 5개 아래 질문 `왜 그렇게 평가했나요?` 표시.
      - 선택 칩 8개: `성실하고 책임감 있어요`, `관련 경험이 있어요`, `소통이 원활해요`, `근무 시간이 잘 맞아요`, `친절해요`, `업무 습득이 빨라요`, `협업을 잘해요`, `기타`.
      - 칩은 복수 선택, 최대 3개. 3개 선택 후 미선택 칩 disabled; 선택된 칩은 다시 눌러 해제 가능.
      - `기타` 선택 시 바로 아래 textarea 노출, label `기타 사유`, maxLength 100, placeholder `예: 장기 근무 가능 여부를 확인하고 싶어요`.
      - 별점과 사유 1개 이상을 고른 뒤 `평가 저장` 버튼 활성. 기타 사유가 2자 미만이면 비활성 + inline error.
      - 별을 누르는 즉시 저장하지 않는다. 한 번의 저장 버튼으로 점수와 사유를 함께 upsert한다.
      - 기존 내 평가가 있으면 점수·사유·기타 문구를 복원해 수정 가능.
      - footer CTA `채용` → `관심 보내기`; 완료 상태 `관심 보냄`. 보조 설명 `상대도 관심을 표시하면 연락처가 열려요`.
    </modified_view>

    <modified_view name="지원자 목록 /employer/applicants">
      - 목록에 보인 것만으로 읽음 처리하지 않는다. 행을 실제로 탭해 상세를 열 때만 `applied → viewed`.
      - 배지: `applied=읽지 않음`, `viewed=읽음`, `accepted=관심 보냄`, `rejected=거절`.
      - 배지 색: 읽지 않음 `info`, 읽음 `neutral`, 관심 보냄 `success`, 거절 `danger`.
      - 각 행 왼쪽에 3px bar, top/bottom 12px inset, radius full. 상태와 같은 semantic 색을 사용.
      - 행 사이 8px 여백과 surface 배경, 1px border. 그림자 금지.
    </modified_view>

    <modified_view name="구인자 내 공고 /employer/jobs">
      - 각 공고 행 왼쪽에 3px `border-line` bar, top/bottom 12px inset.
      - 행 사이 8px 여백, surface 배경, 1px border, radius 8px. 기존 공고 정보와 작성 CTA 유지.
    </modified_view>

    <modified_view name="구직자 지원 현황 /settings/applications">
      - 각 지원 행 왼쪽에 상태색 3px bar, top/bottom 12px inset.
      - `accepted` 사용자 문구를 `구인자가 관심을 보냈어요` 또는 배지 `관심 도착`으로 변경.
      - 상세 화면·알림에서도 `채용 확정` 문구를 제거한다.
      - `rejected`는 `지원 종료`, 나머지는 `지원 완료`, `구인자 읽음`을 유지하되 색을 구분한다.
    </modified_view>

    <modified_view name="매칭 시트">
      - 연락처 영역을 이메일 행과 전화번호 행으로 구성한다.
      - 각 행 오른쪽에 독립 `복사` 버튼. 성공 토스트는 `이메일을 복사했어요`, `전화번호를 복사했어요`.
      - 하단 CTA 두 개: `메일 보내기`와 `전화하기`. 전화는 `tel:` 링크, 이메일은 `mailto:` 링크.
      - 전화번호가 없는 기존 상대는 이메일만 표시하고 `전화번호가 등록되지 않았어요`를 중립 문구로 표시.
      - 둘 다 없거나 RPC 권한이 없으면 기존 `상대 정보를 불러올 수 없어요`; 매칭 여부를 추론할 세부 오류 금지.
      - 340px sheet 폭 유지, 버튼은 모바일에서 세로 8px gap으로 쌓는다.
    </modified_view>

    <modified_view name="공고 상세 /jobs/:jobId">
      - 하단 sticky row: 왼쪽 `지원하기` flex-1, 오른쪽 52×52 outlined heart button.
      - 미찜 aria-label `찜하기`, 찜 상태 `찜 해제`; 상태는 icon fill과 `aria-pressed`로 함께 전달.
      - primary red는 지원하기 하나만 사용. 찜 활성은 ink fill + neutral border로 표시.
      - 찜 성공/해제는 낙관적 UI와 기존 toast/되돌리기 계약 사용.
      - 찜으로 `['jobs']` 캐시에서 항목이 빠져도 상세가 사라지지 않도록 `useJob(jobId)` 단건 캐시를 렌더 근거로 사용.
      - 이미 지원한 공고는 `지원 완료` disabled, 찜 토글은 계속 사용 가능.
    </modified_view>

    <modified_view name="구인자 인터랙티브 튜토리얼 /employer/applicants">
      - 현재처럼 `applicant-deck` 전체를 스포트라이트로 뚫지 않는다. 활성 지원자 카드의 상단 요약 영역에 `data-tour="active-applicant-summary"`를 추가하고 첫 두 단계는 이 작은 영역만 강조한다.
      - 지원자가 없거나 요약 앵커를 측정하지 못하면 빈 상태를 강조하지 않는다. 전체 배경을 `scrim`으로 덮고 설명 카드를 중앙에 표시하며, 빈 상태의 아이콘·문구·`내 공고 보기` CTA가 안내 카드와 동시에 밝게 보이지 않게 한다.
      - 설명 카드가 강조 영역과 겹치거나 양쪽 가용 공간이 168px 미만이면 스포트라이트를 제거한 중앙 정보 모드로 전환한다. 강조 대상 위에 설명 카드를 얹는 배치는 금지한다.
      - 화면 우상단에 따로 떠 있는 X 버튼을 제거하고 설명 카드 제목 행 오른쪽에 44×44 `건너뛰기` IconButton을 배치한다. 따라서 헤더의 알림 종 아이콘과 시각적으로 겹치지 않는다.
      - 설명 카드 max-width 360px, 좌우 여백 16px, padding 16px. 제목 17px/600 한 줄, 본문 14px/1.5 최대 두 줄을 목표로 문구를 축약한다.
      - 하단은 점 인디케이터와 CTA를 분리하되 전체 카드 목표 높이는 188px 이하로 한다. 동적 글자 확대에서는 높이 제한으로 내용을 자르지 않고 자연스럽게 확장한다.
      - 구인자 모든 단계는 `다음`을 처음 프레임부터 표시한다. 특히 `오른쪽으로 밀면 관심 있어요` 단계는 실제 오른쪽 스와이프로도 진행되고, 스와이프하지 않아도 즉시 `다음`을 누를 수 있어야 한다.
      - 단계 문구는 한 화면에 행동 하나만 제시한다. 2단계 본문은 `함께 일하고 싶다면 오른쪽으로 밀어보세요.`로 줄이고, `지원자에게 바로 알림이 갑니다`는 작은 보조 문구 한 줄로 분리한다.
      - 320px 폭, iOS Safari 주소창 펼침/접힘, safe-area inset에서 카드·닫기·CTA가 헤더/하단 탭과 겹치지 않아야 한다.
    </modified_view>

    <modified_view name="알림 /notifications — 구인자·구직자 공통">
      - 각 행의 가장 왼쪽에 폭 20px 상태 rail을 고정한다. 미읽음은 rail 중앙의 8×8 `bg-brand` 빨간 점, 읽음은 같은 공간의 빈 placeholder를 사용해 모든 행 본문 시작선을 맞춘다.
      - 미읽음 행은 빨간 점 + `bg-brand-soft` 배경을 함께 쓰고 `sr-only` 텍스트 `읽지 않은 알림`을 제공한다. 읽은 행은 점 없이 `bg-surface`; 색만으로 읽음 여부를 전달하지 않는다.
      - 기존 제목 앞의 6px 검은 점은 제거한다. 빨간 점은 아이콘이나 제목 내부가 아니라 행의 절대적인 왼쪽 첫 요소여야 한다.
      - 상태 rail 다음에는 44×44 시각 식별 영역을 둔다. `job.imageUrl`이 있으면 `object-cover` 썸네일을 표시하고, 우하단 18px 원형 배지에 알림 종류 아이콘을 겹쳐 표시한다.
      - 공고 이미지가 없거나 이미지 `onError`가 발생하면 썸네일 전체를 종류별 soft 배경과 아이콘으로 교체한다. 깨진 이미지 아이콘이나 빈 회색 원을 노출하지 않는다.
      - 본문 첫 줄에 11px/600 종류 라벨을 먼저 표시한다. 매핑은 `application_received=새 지원`, `application_viewed=지원서 읽음`, `application_accepted=관심 도착`, `employer_interested=관심 도착`, `mutual_match=매칭`, `application_rejected=지원 종료`, `system=안내`.
      - 종류 tone은 `새 지원=info`, `지원서 읽음=neutral`, `관심 도착=brand`, `매칭=success`, `지원 종료=danger`, `안내=neutral`. 라벨 텍스트와 아이콘을 함께 바꾸므로 색에만 의존하지 않는다.
      - 정보 순서는 `종류 라벨 → 제목 14px/600 한 줄 → 가게명 또는 본문 13px 최대 두 줄 → 상대 시간 11px`이다. `job.storeName`이 있으면 제목과 중복되지 않는 별도 가게명 줄을 우선 제공한다.
      - legacy `application_accepted`의 저장된 title/body에 `채용` 문구가 있어도 표시 계층에서는 `관심` 문구로 정규화한다. DB 과거 알림을 일괄 수정하지 않는다.
      - 행은 최소 높이 88px, 좌우 12px, 세로 12px, 행 사이 1px divider. 320px 폭에서 점·썸네일·라벨·제목이 겹치지 않아야 한다.
      - 알림 행 탭으로 유효한 상세/매칭 시트를 연 직후에만 읽음 처리한다. `applicationId` 등 이동 정보가 없어 오류 토스트만 뜬 경우에는 미읽음 상태를 유지한다.
      - `모두 읽음`은 기존 동작을 유지하며 성공 직후 모든 빨간 점과 미읽음 배경이 같은 프레임에서 사라진다.
    </modified_view>

    <shared_required_marker>
      - 시각: label 뒤 4px 간격, `text-error`, 문자 `*`, aria-hidden.
      - 접근성: label 안에 sr-only `(필수)`.
      - native `required`/`aria-required=true`도 함께 적용하되 브라우저 기본 validation bubble은 `noValidate`로 사용하지 않는다.
      - `[필수]` 문자열은 전 화면에서 제거하고 `*`로 통일한다.
    </shared_required_marker>
  </ui_changes>

  <integration_points>
    <point owner="A" files="src/types.ts">
      `PhoneContact`, `RatingReasonCode`, `RatingInput`, optional `AuthUser.phone` 계약을 단독 `contract:` 커밋으로 제공한다. B는 이 커밋 이후 시작한다.
    </point>
    <point owner="B" files="src/components/ui/RequiredMark.tsx, src/components/ui/Input.tsx, src/components/ui/Badge.tsx, src/styles/globals.css">
      B가 필수 마커와 `info` badge semantic token/variant를 먼저 제공한다. A는 export된 `RequiredMark`만 import하고 B 파일을 수정하지 않는다.
    </point>
    <point owner="A" files="supabase/schema_phase11.sql, src/lib/auth-context.tsx, src/features/auth/validation.ts, src/pages/SignupPage.tsx">
      전화번호 가입·저장 계약을 구현한다. B는 Signup 파일을 수정하지 않는다.
    </point>
    <point owner="A" files="src/lib/api/ratings.ts, src/hooks/useSeekerRating.ts">
      B의 `SeekerRating`에 `myReasons`, `myOtherReason`, `rate(input)`을 제공한다.
    </point>
    <point owner="A" files="src/hooks/useMatchedContact.ts, src/lib/api/jobs.ts, src/hooks/useJob.ts">
      B에 `{contact,isLoading,isError,retry}`와 단건 `job` 계약을 제공한다.
    </point>
    <point owner="B" files="src/features/employer-ui/SeekerRating.tsx, src/features/employer-ui/ApplicantDetail.tsx">
      A의 hook 반환형만 소비한다. Supabase import 금지.
    </point>
    <point owner="B" files="src/features/notifications/MatchSheet.tsx, src/features/notifications/useMatchedContact.ts, src/features/notifications/index.ts, src/pages/JobDetailPage.tsx, src/features/wishlist/BackFace.tsx">
      A hook만 소비해 전화/찜 UI를 구성한다. DB 상태를 별도로 복제하지 않는다. 기존 B 로컬 `features/notifications/useMatchedContact.ts`는 제거하고 export도 정리해 동일 이름 hook 두 벌이 남지 않게 한다.
    </point>
    <point owner="A" files="src/lib/notifications/presentation.ts, src/lib/api/notifications.ts, src/hooks/useNotifications.ts">
      알림 type·role을 입력받아 `{label, tone, displayTitle, storeName, destination}`을 반환하는 순수 presentation 계약을 제공한다. legacy `application_accepted` 문구 정규화와 유효 destination 판정은 여기서 수행하고 JSX·lucide icon은 반환하지 않는다.
    </point>
    <point owner="B" files="src/features/notifications/NotificationList.tsx, src/pages/NotificationsPage.tsx">
      A의 presentation 계약과 기존 `NotificationItem.job.imageUrl`을 소비해 빨간 미읽음 rail, 썸네일/fallback, 종류 라벨을 렌더한다. DB 문구를 JSX 안에서 다시 분기하지 않는다.
    </point>
    <point owner="B" files="src/features/onboarding/InteractiveTutorial.tsx, src/features/onboarding/employerSteps.ts, src/features/onboarding/useAnchorRect.ts, src/features/employer-deck/ApplicantDeck.tsx">
      구인자 활성 카드 요약 앵커와 compact 정보 모드를 구현한다. 구직자 단계 배열·저장 키·스와이프 이벤트 계약은 변경하지 않는다.
    </point>
  </integration_points>

  <core_functionality>
    <form_error_navigation>
      1. submit 시 모든 필드를 한 번 검증한다.
      2. 화면 순서대로 첫 오류 key를 결정한다.
      3. 오류 state를 먼저 반영한 뒤 `requestAnimationFrame`에서 wrapper를 찾는다.
      4. reduced motion 여부에 따라 smooth/auto scroll.
      5. wrapper 내부 첫 invalid control에 focus. custom weekday group은 첫 요일 버튼에 focus.
      6. 사용자가 값을 고치면 해당 field error만 지운다.
    </form_error_navigation>
    <interest_semantics>
      - 사용자 노출에서 “채용”을 전부 제거한다.
      - employer의 `accepted` 전환은 offer right upsert로 이어져야 한다.
      - offer trigger가 관심 알림 또는 상호 매칭 알림을 생성한다.
      - application status trigger는 accepted에 대해 별도 “채용 확정” 알림을 만들지 않아 중복 알림을 막는다.
      - 거절은 기존 `rejected`와 지원 종료 알림을 유지한다.
    </interest_semantics>
    <read_state>
      - `applied`는 unread다.
      - list viewport 노출은 상태를 바꾸지 않는다.
      - 상세 open 이벤트에서 한 번만 viewed mutation을 호출한다.
      - accepted/rejected는 viewed보다 우선하며 상세 재열기로 덮어쓰지 않는다.
    </read_state>
    <rating_reasons>
      - rating draft는 로컬 state로 관리한다.
      - 제출 직전 score, 사유 개수, enum, 기타 길이를 다시 검사한다.
      - RPC 성공 후 query invalidate, 성공 toast.
      - 실패 시 draft 보존, error toast; 기존 저장값을 낙관적으로 덮지 않는다.
    </rating_reasons>
    <matched_contact>
      - 상호 right offer가 확인된 경우에만 이메일·전화번호 반환.
      - UI 복사는 항목별로 수행하며 clipboard 실패 시 해당 텍스트를 select-all 가능 상태로 바꾼다.
      - `mailto:`와 `tel:`은 사용자의 명시적 탭에서만 실행한다.
    </matched_contact>
    <job_wishlist_toggle>
      - 상세 진입 시 `useJob(jobId)`와 `useWishlist()`로 공고와 찜 상태를 읽는다.
      - 미찜→찜: 기존 swipe upsert right.
      - 찜→해제: 기존 swipe row를 left로 update하는 remove 계약.
      - 단건 query cache는 두 mutation에서 제거하지 않는다.
    </job_wishlist_toggle>
    <employer_tutorial_clarity>
      - employer 첫 두 단계에서 활성 지원자 요약 앵커 존재 여부와 non-overlap 공간을 계산한다.
      - 앵커가 없거나 설명 카드가 침범하면 spotlight를 끄고 full scrim 정보 모드로 전환한다.
      - 닫기는 카드 내부에서 처리하고, 모든 employer 단계의 다음 CTA는 즉시 활성화한다.
      - 실제 right swipe 이벤트가 들어오면 기존처럼 다음 단계로 한 번만 진행한다.
      - seeker 튜토리얼의 swipe 대기/8초 fallback 동작은 그대로 유지한다.
    </employer_tutorial_clarity>
    <notification_visual_hierarchy>
      - A의 순수 presentation 함수로 종류 label, tone, 사용자 문구, destination을 먼저 확정한다.
      - B는 unread rail, thumbnail 또는 fallback icon, label/title/body/time 순서로 렌더한다.
      - 이미지 load error는 해당 행 로컬 상태만 fallback으로 바꾸고 다른 알림에 영향을 주지 않는다.
      - 유효 destination을 연 뒤 markRead하며, invalid destination은 toast만 띄우고 unread를 보존한다.
      - markRead 실패 시 기존 optimistic rollback으로 빨간 점과 상단 숫자 배지를 함께 복원한다.
    </notification_visual_hierarchy>
  </core_functionality>

  <error_handling>
    <form_validation>
      - inline error는 해당 control과 `aria-describedby`로 연결.
      - 첫 오류 scroll/focus가 실패해도 폼과 오류 문구는 그대로 남는다.
      - 전화번호·최저시급은 클라이언트와 DB 양쪽에서 검증.
      - 평가 기타 입력은 공백만 2자 이상으로 세지 않으며 `trim()` 후 검사.
    </form_validation>
    <network>
      - 전화번호/평가/찜 저장 실패는 기존 `useToast().error` 사용.
      - 네트워크 실패 시 입력 draft 보존.
      - 연락처 RPC 실패는 재시도 버튼 제공; 이메일만 성공/전화만 실패 같은 부분 상태는 만들지 않는다.
      - 알림 썸네일 로드 실패는 네트워크 오류 toast를 띄우지 않고 종류별 fallback 타일로 대체한다.
    </network>
    <privacy>
      - 매칭되지 않은 연락처 요청은 404처럼 구분하지 않고 null 반환.
      - 콘솔에 전화번호, 이메일, 평가 기타 문구를 로그하지 않는다.
    </privacy>
  </error_handling>

  <regression_risks>
    - Signup partial account: 전화번호 저장을 가입 후 별도 insert로 하면 실패 시 연락처 없는 계정이 남는다. auth.users trigger로 원자화하고 신규 가입 E2E로 검증.
    - RPC breaking change: 기존 `matched_contact()` 반환을 json으로 바꾸면 배포 중 구버전 번들이 깨진다. `matched_contact_v2()`를 추가하고 migration 먼저 적용.
    - accepted 중복 알림: application status trigger와 offer trigger가 동시에 발화할 수 있다. accepted 알림 분기를 제거하고 offer trigger 하나만 사용자 알림을 생성.
    - 읽음 오판: IntersectionObserver를 남겨 두면 스크롤만 해도 unread가 사라진다. ApplicantCard observer와 timer를 완전히 제거.
    - 상세 찜 후 NotFound: 기존 `['jobs']` cache만 렌더 근거로 쓰면 swipe mutation이 공고를 제거한다. 단건 query cache 도입.
    - 최저시급 상수 불일치: Signup/Profile/Employer form마다 숫자를 복제하지 않는다. A의 `src/lib/wage.ts` 한 곳을 단일 소스로 사용하고 DB migration 주석에 같은 값을 명시.
    - 기존 사용자 전화번호 null: MatchSheet는 이메일만으로 정상 동작해야 하며 전화 CTA만 숨기거나 disabled 처리.
    - Badge 색 회귀: 새 info token 추가 후 success/danger/neutral 기존 사용처를 시각 점검.
    - 폼 focus와 sticky header: `block:'center'`를 사용해 56px top bar 뒤에 필드가 숨지 않게 한다.
    - 같은 파일 충돌: A/B ownership 표 외 수정 금지. 특히 `src/types.ts`는 단독 계약 커밋 외 변경 금지.
    - 튜토리얼 이중 강조: 큰 deck anchor를 유지하면 빈 상태와 설명 카드가 동시에 전면에 보인다. employer 첫 두 단계 anchor를 활성 카드 요약으로 교체하고 no-card에서는 spotlight를 만들지 않는다.
    - 헤더 컨트롤 충돌: fixed X를 유지하면 알림 종과 겹친다. X를 카드 안으로 옮기고 safe-area/320px를 실기기 검증한다.
    - 알림 이미지 실패: URL 오류로 회색 빈칸이 생기면 오히려 식별력이 낮아진다. `onError` 즉시 type fallback으로 전환한다.
    - 잘못된 읽음 처리: 목적지가 없는 알림을 탭하자마자 markRead하면 사용자는 내용을 확인하지 못하고 빨간 점만 사라진다. destination 유효성 확인과 화면 open 후에만 mutation한다.
  </regression_risks>

  <migration_plan>
    <preflight>
      1. `select count(*) from jobs where hourly_wage &lt; 10320;` 결과 0 확인.
      2. `select count(*) from jobs where employer_id is null;` 결과 0 확인.
      3. 현재 `matched_contact(uuid)` 함수 정의 백업.
    </preflight>
    <database_first>
      1. `schema_phase11.sql` 실행: `user_contacts`, Auth trigger, rating columns/check, rating RPC, jobs wage CHECK, `matched_contact_v2`.
      2. 기존 사용자 전화번호는 backfill하지 않는다. 이메일 fallback 유지.
      3. 기존 `seeker_ratings`는 빈 reasons 허용. 새 저장 RPC에서만 1개 이상 강제.
      4. DB 검증 query가 모두 통과하기 전 앱 코드를 main에 배포하지 않는다.
    </database_first>
    <application_deploy>
      1. A contract commit과 B RequiredMark commit 병합.
      2. A/B 구현 브랜치를 각각 최신 main에 rebase.
      3. A 브랜치 먼저 merge, B 브랜치 merge.
      4. `tsc --noEmit`, ESLint, production build, ownership verify 실행.
      5. main push 후 Vercel bundle hash가 local dist와 일치할 때까지 확인.
      6. 튜토리얼·알림 가독성 변경은 기존 `read_at`, `job.imageUrl`, role별 튜토리얼 배열을 재사용하므로 별도 DB migration 없이 앱 배포에 포함한다.
    </application_deploy>
    <rollback>
      - 앱 롤백: Phase 11 직전 `12ee485` 배포. additive RPC/table/columns는 남겨도 구버전과 호환.
      - DB 롤백 시 `matched_contact_v2`, rating RPC, auth trigger를 먼저 제거한 뒤 새 columns/table 제거.
      - jobs 최저시급 CHECK는 앱 롤백과 무관하게 유지 가능.
    </rollback>
  </migration_plan>

  <final_integration_test>
    <test_scenario_1>
      <description>공고 작성 첫 오류 자동 이동과 필수 표시</description>
      <steps>
        1. 구인자로 `/employer/jobs/new` 진입한다.
        2. 필수 7개 label 옆 `*`가 있고 선택 항목에는 없는지 확인한다.
        3. 모든 값을 비우고 공고 올리기를 누른다.
        4. 화면이 가게 이름으로 200ms smooth scroll되고 input에 focus되는지 확인한다.
        5. 위 필드를 채우고 시급에 `10000`을 입력한 뒤 다시 제출한다.
        6. 시급으로 이동하고 `2026년 최저시급(10,320원) 이상` 오류가 연결되는지 확인한다.
        7. `10320`과 나머지 필수값을 입력해 저장한다.
        8. DB의 hourly_wage가 10320이고 공고가 목록에 표시되는지 확인한다.
      </steps>
    </test_scenario_1>

    <test_scenario_2>
      <description>회원가입 전화번호와 하위 호환</description>
      <steps>
        1. `/signup` 1단계 필수 라벨과 전화번호 필드를 확인한다.
        2. `010-12`로 다음을 눌러 전화번호 오류와 focus를 확인한다.
        3. `010-1234-5678`로 가입을 완료한다.
        4. user_contacts.phone이 `01012345678`로 저장됐는지 확인한다.
        5. metadata/로그/URL에 전화번호가 불필요하게 노출되지 않는지 확인한다.
        6. 전화번호가 없는 기존 계정으로 로그인한다.
        7. 기존 기능이 오류 없이 동작하는지 확인한다.
        8. 상호 매칭 전 `matched_contact_v2`가 null인지 확인한다.
      </steps>
    </test_scenario_2>

    <test_scenario_3>
      <description>지원자 읽음 상태와 관심 의미</description>
      <steps>
        1. 새 application을 만들어 구인자 목록에서 `읽지 않음` info 배지를 확인한다.
        2. 행이 2초 이상 viewport에 보여도 상태가 applied인지 확인한다.
        3. 행을 탭해 상세를 연다.
        4. 상태가 viewed로 한 번만 바뀌고 배지가 `읽음` neutral인지 확인한다.
        5. `관심 보내기`를 누른다.
        6. application 내부 status는 accepted, 사용자 배지는 `관심 보냄`인지 확인한다.
        7. offers right 행이 생기고 “채용 확정” 알림은 생기지 않는지 확인한다.
        8. 상대가 이미 right인 경우 양쪽에 mutual_match 알림이 각각 한 건만 생기는지 확인한다.
      </steps>
    </test_scenario_3>

    <test_scenario_4>
      <description>평가 복수 사유와 기타 입력</description>
      <steps>
        1. 지원자 상세에서 별 4개를 선택한다.
        2. 평가가 즉시 저장되지 않고 저장 버튼이 아직 비활성인지 확인한다.
        3. 사유 3개를 선택하고 네 번째 미선택 칩이 disabled인지 확인한다.
        4. 하나를 해제하고 `기타`를 선택한다.
        5. 공백만 입력했을 때 저장되지 않는지 확인한다.
        6. 2~100자 기타 사유를 입력해 저장한다.
        7. 새로고침 후 4점, 2개 일반 사유, 기타 문구가 복원되는지 확인한다.
        8. 다른 구인자가 권한 없는 지원자를 평가할 때 DB가 거부하는지 확인한다.
      </steps>
    </test_scenario_4>

    <test_scenario_5>
      <description>이메일·전화번호 매칭 연락처</description>
      <steps>
        1. seeker와 employer가 서로 right offer를 만들어 매칭한다.
        2. mutual_match 알림을 눌러 MatchSheet를 연다.
        3. 이메일과 포맷된 전화번호가 모두 보이는지 확인한다.
        4. 이메일 복사와 전화번호 복사를 각각 눌러 값과 토스트를 확인한다.
        5. `메일 보내기`의 mailto와 `전화하기`의 tel 링크를 확인한다.
        6. 전화번호 없는 기존 계정과 매칭해 이메일만 표시되는지 확인한다.
        7. 매칭되지 않은 counterpart id로 RPC를 호출해 null인지 확인한다.
        8. 로그와 네트워크 오류 메시지에 연락처 원문이 남지 않는지 확인한다.
      </steps>
    </test_scenario_5>

    <test_scenario_6>
      <description>공고 상세 찜 토글과 캐시 안정성</description>
      <steps>
        1. 홈의 미찜 공고를 탭해 `/jobs/:id`로 이동한다.
        2. 하단에 지원하기와 52px 찜 버튼이 함께 보이는지 확인한다.
        3. 찜을 눌러도 상세 화면이 NotFound로 바뀌지 않는지 확인한다.
        4. 찜 버튼이 pressed 상태로 바뀌고 찜 목록에 공고가 추가되는지 확인한다.
        5. 같은 화면에서 찜 해제 후 상태와 토스트를 확인한다.
        6. 찜 목록에서 같은 공고 상세로 진입해 동일 CTA row를 확인한다.
        7. 지원 완료 공고는 지원 CTA만 disabled이고 찜은 동작하는지 확인한다.
        8. 뒤로가기가 실제 진입 화면으로 돌아가는지 확인한다.
      </steps>
    </test_scenario_6>

    <test_scenario_7>
      <description>목록 시각 구분과 상태색</description>
      <steps>
        1. 지원자 목록에 applied/viewed/accepted/rejected 샘플을 준비한다.
        2. 네 배지가 info/neutral/success/danger로 서로 구분되는지 확인한다.
        3. 각 행 왼쪽 bar가 위아래 12px 여백을 두고 상태색과 일치하는지 확인한다.
        4. 320px 폭에서 닉네임·배지·chevron이 겹치지 않는지 확인한다.
        5. 구인자 내 공고 목록의 중립 bar와 8px 행 간격을 확인한다.
        6. 구직자 지원 현황의 상태 bar와 문구를 확인한다.
        7. 키보드 Tab과 Enter로 각 행 상세를 열 수 있는지 확인한다.
        8. 색을 제외한 badge text만으로도 상태를 구분할 수 있는지 확인한다.
      </steps>
    </test_scenario_7>

    <test_scenario_8>
      <description>구인자 튜토리얼 겹침 방지와 즉시 다음 진행</description>
      <steps>
        1. 지원자가 없는 새 구인자 계정으로 `/employer/applicants` 첫 진입한다.
        2. 빈 상태 전체가 밝게 뚫리지 않고 full scrim 위 중앙 정보 카드 하나만 강조되는지 확인한다.
        3. 닫기 X가 카드 제목 행 안에 있고 헤더 알림 종과 겹치지 않는지 확인한다.
        4. `오른쪽으로 밀면 관심 있어요` 단계에 진입하자마자 `다음` 버튼이 보이는지 확인한다.
        5. `다음`을 눌러 대기 없이 3단계로 이동하는지 확인한다.
        6. 지원자가 있는 계정에서는 활성 카드 상단 요약만 강조되고 안내 카드가 그 영역을 덮지 않는지 확인한다.
        7. 실제 오른쪽 스와이프로도 한 단계만 진행되는지 확인한다.
        8. 320px iPhone viewport와 글자 확대 200%에서 닫기·본문·CTA가 잘리거나 헤더/하단 탭과 겹치지 않는지 확인한다.
      </steps>
    </test_scenario_8>

    <test_scenario_9>
      <description>양 역할 알림 미읽음 표시와 내용 종류 식별</description>
      <steps>
        1. 구인자와 구직자 각각에 모든 NotificationType의 읽음/미읽음 샘플을 준비한다.
        2. 모든 미읽음 행의 가장 왼쪽에 8px 빨간 점이 있고 읽은 행에는 같은 폭의 빈 rail이 유지되는지 확인한다.
        3. 스크린리더가 미읽음 행에서 `읽지 않은 알림`을 읽는지 확인한다.
        4. 이미지가 있는 공고 알림은 44px 썸네일과 종류 아이콘 배지, 이미지가 없는 알림은 종류별 fallback 타일인지 확인한다.
        5. 잘못된 이미지 URL을 강제로 넣어 깨진 이미지 대신 fallback이 나오는지 확인한다.
        6. 종류 라벨 6종과 label/icon tone이 일치하고, 색을 가려도 텍스트와 아이콘으로 종류를 구분할 수 있는지 확인한다.
        7. 정상 알림을 탭해 상세를 연 뒤에만 빨간 점과 상단 unread count가 함께 감소하는지 확인한다.
        8. destination이 없는 알림을 탭하면 오류 toast가 뜨되 빨간 점은 유지되고, `모두 읽음` 성공 시 모든 점이 한 프레임에 사라지는지 확인한다.
      </steps>
    </test_scenario_9>
  </final_integration_test>

  <success_criteria>
    <functionality>
      - 공고 작성 필수 오류 7종 모두 첫 오류로 자동 이동하고 focus된다.
      - 신규 공고는 UI와 DB 모두 10,320원 미만 저장 0건.
      - 신규 가입 전화번호 저장 성공률 100%, 형식 불량 저장 0건.
      - 상호 매칭 전 연락처 유출 0건; 매칭 후 존재하는 이메일·전화번호 반환 성공.
      - 평가 사유 1~3개와 기타 조건이 UI/DB 양쪽에서 동일하게 적용된다.
      - 사용자 노출 문자열에서 `채용`, `채용 확정` 검색 결과 0건. 법적/개발 주석은 제외.
      - 상세 찜 후 NotFound 또는 화면 깜빡임 0회.
      - 구인자 인터랙티브 튜토리얼 4단계에서 안내 카드와 강조 대상·헤더 컨트롤 겹침 0회.
      - 유효 상세를 열지 못한 알림의 오읽음 처리 0건; 정상 open과 모두 읽음에서 점/count 불일치 0건.
    </functionality>
    <user_experience>
      - 필수 표시가 모든 필수 label 바로 옆에 일관되게 위치.
      - 목록 네 상태는 text와 color 두 수단으로 구분.
      - 모든 신규 버튼/칩 터치 타겟 44px 이상.
      - reduced motion 환경에서 강제 smooth scroll과 transition 없음.
      - 미읽음 알림은 왼쪽 빨간 점·배경·스크린리더 문구 세 수단으로 구분.
      - 알림 7종은 종류 라벨과 아이콘으로 구분되며 이미지가 없어도 빈 회색 원을 표시하지 않음.
      - 320px 및 글자 확대 200%에서 구인자 튜토리얼과 알림 행의 겹침·잘림 없음.
    </user_experience>
    <technical_quality>
      - A/B 동시 수정 파일 0개, merge conflict 0개.
      - 모든 Supabase 호출에 error throw, 연락처는 RPC 외 직접 조회 0건.
      - `src/types.ts` 변경은 단독 `contract:` 커밋 하나.
      - `any` cast, component hex literal, `dangerouslySetInnerHTML`, `100vh` 신규 도입 0건.
    </technical_quality>
    <build>
      - `npx tsc --noEmit`, `npm run lint`, `npm run build` 모두 exit 0.
      - ownership verify 전 항목 PASS.
      - main push 후 Vercel JS bundle hash가 local dist와 일치.
    </build>
  </success_criteria>

  <implementation_order>
    <phase_0_contract_and_primitive parallel="true">
      <task owner="A" estimate="0.5h">
        A-0: `src/types.ts`에 PhoneContact, RatingReasonCode, RatingInput, AuthUser.phone 계약만 추가. `contract: Phase 11 연락처·평가 계약` 단독 커밋.
      </task>
      <task owner="B" estimate="0.5h">
        B-0: `RequiredMark`, B Input/Textarea required label, Badge info variant와 status token 추가. A 파일 수정 금지.
      </task>
      <gate>A-0와 B-0를 main에 먼저 병합한 뒤 양쪽 구현 브랜치를 새 main에서 생성한다.</gate>
    </phase_0_contract_and_primitive>

    <phase_1_parallel_implementation parallel="true">
      <agent_a total_estimate="6.75h">
        <task id="A-1" estimate="1.5h" files="supabase/schema_phase11.sql, src/lib/auth-context.tsx, src/features/auth/validation.ts, src/pages/SignupPage.tsx">
          user_contacts, Auth trigger, 전화번호 검증/가입, 필수 label과 개인정보 문구. B 파일 수정 금지.
        </task>
        <task id="A-2" estimate="1.25h" files="src/features/auth/form-primitives.tsx, src/pages/EmployerJobFormPage.tsx, src/lib/wage.ts, supabase/schema_phase11.sql">
          A 폼 required 지원, 첫 오류 scroll/focus, 최저시급 단일 상수와 DB CHECK. `schema_phase11.sql`은 A 단독 소유라 A-1과 같은 브랜치에서만 편집.
        </task>
        <task id="A-3" estimate="1.5h" files="src/lib/api/ratings.ts, src/hooks/useSeekerRating.ts, src/lib/api/applications.ts, supabase/schema_phase11.sql, supabase/schema_phase3_ux.sql">
          평가 사유 저장 계약과 accepted→offer right trigger, 중복 “채용 확정” 알림 제거. 기존 migration 파일은 문서 기준 동기화, 실제 실행은 schema_phase11만.
        </task>
        <task id="A-4" estimate="0.5h" files="src/hooks/useMatchedContact.ts, src/lib/api/jobs.ts, src/hooks/useJob.ts">
          matched_contact_v2 hook과 공고 단건 query.
        </task>
        <task id="A-5" estimate="0.5h" files="src/pages/EmployerJobsPage.tsx">
          구인자 내 공고 목록 bar/spacing. B가 이 파일을 건드리지 않는다.
        </task>
        <task id="A-6" estimate="1.5h" files="src/lib/notifications/presentation.ts, src/lib/api/notifications.ts, src/hooks/useNotifications.ts">
          role/type별 알림 label·tone·legacy 관심 문구·유효 destination 순수 계약과 open 후 읽음 처리 지원. JSX, CSS, lucide import 금지.
        </task>
      </agent_a>

      <agent_b total_estimate="6.75h">
        <task id="B-1" estimate="1.5h" files="src/features/employer-ui/SeekerRating.tsx">
          별점 draft, 8개 복수 사유 칩, 기타 textarea, 저장 CTA, 기존 평가 복원.
        </task>
        <task id="B-2" estimate="1.5h" files="src/features/employer-ui/ApplicantCard.tsx, src/features/employer-ui/ApplicantDetail.tsx, src/features/employer-ui/applicationPresentation.ts, src/pages/EmployerApplicantsPage.tsx">
          IntersectionObserver 제거, open 시 읽음, 네 상태 배지/bar, 채용→관심 문구.
        </task>
        <task id="B-3" estimate="0.75h" files="src/features/apply/applicationPresentation.ts, src/pages/MyApplicationsPage.tsx, src/pages/ApplicationDetailPage.tsx">
          구직자 관심 문구와 지원 목록 상태 bar. A 파일 수정 금지.
        </task>
        <task id="B-4" estimate="0.75h" files="src/features/notifications/MatchSheet.tsx, src/features/notifications/useMatchedContact.ts, src/features/notifications/index.ts">
          이메일·전화번호 두 행, 항목별 복사, mailto/tel CTA와 기존 사용자 fallback. 중복된 B 로컬 useMatchedContact 제거 후 A hook으로 import 전환.
        </task>
        <task id="B-5" estimate="0.75h" files="src/pages/JobDetailPage.tsx, src/features/wishlist/BackFace.tsx">
          단건 job hook 소비, 지원+찜 CTA row, optimistic toggle와 접근성.
        </task>
        <task id="B-6" estimate="0.75h" files="src/features/onboarding/InteractiveTutorial.tsx, src/features/onboarding/employerSteps.ts, src/features/onboarding/useAnchorRect.ts, src/features/employer-deck/ApplicantDeck.tsx">
          구인자 active summary spotlight, no-card full scrim, 카드 내부 X, compact 문구/배치, 모든 단계 즉시 다음. seeker 튜토리얼 계약 변경 금지.
        </task>
        <task id="B-7" estimate="0.75h" files="src/features/notifications/NotificationList.tsx, src/pages/NotificationsPage.tsx, src/styles/globals.css">
          왼쪽 빨간 unread rail, 공고 썸네일+종류 아이콘, fallback, 종류 라벨과 open 이후 읽음 UI. A의 presentation 계약만 소비.
        </task>
      </agent_b>
    </phase_1_parallel_implementation>

    <phase_2_integration>
      1. A가 `schema_phase11.sql`을 실제 Supabase에 실행하고 SQL 검증 결과를 기록한다.
      2. A 브랜치를 main에 merge하고 typecheck한다.
      3. B가 최신 main을 merge한 뒤 B 브랜치를 main에 merge한다.
      4. A/B 수정 경로 교집합이 0인지 `git diff --name-only`로 확인한다.
      5. final_integration_test 1~9, 특히 실기기 scroll/focus, tel link, sticky CTA, iOS 튜토리얼 safe-area, 알림 이미지 fallback을 수행한다.
      6. 전체 검증 후 main push와 Vercel bundle 확인.
    </phase_2_integration>

    <workload_balance>
      - A: 6.75시간 — DB/Auth/RPC/폼 데이터 계약, 내 공고 UI, 알림 presentation/read 계약.
      - B: 6.75시간 — 평가/상태/목록/매칭/상세, 튜토리얼과 알림 visual UI.
      - 예상량 차이 0시간. A/B 동시 수정 파일 0개.
      - A의 DB migration이 가장 긴 critical path이므로 A-1/A-2/A-3를 먼저 시작하고, B는 계약과 primitive 병합 직후 병렬 진행한다.
    </workload_balance>
  </implementation_order>
</feature_specification>
