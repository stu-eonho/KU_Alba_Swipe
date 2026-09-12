/**
 * OWNER: 개발자 A + B 공동 (이 저장소에서 유일한 공동 소유 파일)
 *
 * A와 B 사이의 계약 파일입니다. 이 파일의 타입이 곧 API 계약입니다.
 *
 * 규칙:
 *  1. 변경할 때는 이 파일만 담은 단독 커밋으로 올린다. 다른 파일 변경을 섞지 않는다.
 *  2. 커밋 메시지는 `contract:` 접두사를 쓴다.  예) contract: Job에 distanceKm 추가
 *  3. 푸시 직후 팀 채널에 한 줄 공지한다. 상대는 즉시 git pull 한다.
 *  4. 필드 추가는 자유. 필드 삭제/이름 변경/타입 변경은 구두 합의 후.
 *     7시간짜리 프로젝트에서는 지우는 것보다 optional로 남기는 게 거의 항상 옳다.
 *
 * 주의: DB 컬럼은 snake_case, 여기 타입은 camelCase입니다.
 *       변환은 오직 src/lib/api/ 안에서만 합니다.
 *       B의 컴포넌트에 store_name 같은 snake_case가 등장하면 경계가 무너진 것입니다.
 */

/** 공고. 시드로만 주입되며 앱에서는 읽기 전용. */
export type Job = {
  id: string;
  /** 가게명 — 격자 카드 앞면 1행 */
  storeName: string;
  /** 직종 — 카페, 음식점, 편의점, 판매, 배달, 물류, 사무, 과외, 행사, 주방, 기타 */
  category: string;
  /** 시급 (정수, 원 단위) */
  hourlyWage: number;
  /** 한 줄 요약 "어떠한 일인지" — 격자 카드 앞면에 2줄까지 표시 */
  summary: string;
  /** 상세 설명 — 카드 뒷면 */
  description: string;
  /** 가게 주소 — 카드 뒷면 */
  address: string;
  /**
   * 시·도 단위 지역 ("서울", "경기", "부산"…). 지역 필터의 기준입니다.
   *
   * 시·군·구까지 쪼개지 않는 이유는 데이터가 성북구에 몰려 있어서입니다.
   * 구 단위로 거르면 어느 구를 골라도 0건이 나와 필터가 죽어 보입니다.
   *
   * DB 컬럼이 비어 있으면 주소 첫 조각으로 채웁니다. 마이그레이션 전에도
   * 값이 항상 들어 있으므로 화면은 빈 문자열을 걱정하지 않아도 됩니다.
   */
  region: string;
  /** 예: "월·수·금" */
  workDays: string;
  /** 예: "09:00 ~ 14:00" */
  workHours: string;
  /** 복리후생 태그 (최대 4개). 예: ["식사제공", "주휴수당"] */
  benefits: string[];
  /** 0.0 ~ 5.0 */
  rating: number;
  reviewCount: number;
  /** null이면 카테고리 기본 그라디언트로 대체 */
  imageUrl: string | null;
  /** 공고 주인(사업자). 시드 공고는 데모 사업자 계정으로 몰아줍니다 */
  employerId: string | null;
  /**
   * "이런 분을 찾아요" — 사장님이 고른 성격 키워드.
   *
   * 구직자 프로필의 personalityTraits 와 **같은 목록**(PERSONALITY_TRAITS)을 씁니다.
   * 따로 만들면 양쪽 어휘가 갈려서 매칭 이야기가 성립하지 않습니다.
   *
   * optional 인 이유는 rollout 안전입니다. 마이그레이션 전 행과, 아직 이 필드를
   * 매핑하지 않은 브랜치의 코드가 그대로 컴파일돼야 합니다.
   */
  wantedTraits?: PersonalityTrait[];
};

/** 공고별 리뷰. 카드 뒷면에 최대 3개 노출. 시드 전용(앱에서 작성 불가). */
export type Review = {
  id: string;
  jobId: string;
  authorName: string;
  /** 1 ~ 5 */
  rating: number;
  content: string;
  createdAt: string;
};

/** left = 관심 없음, right = 찜 */
export type SwipeDirection = 'left' | 'right';

/** 찜 목록의 한 항목 (direction이 'right'인 스와이프 + 공고 조인 결과) */
export type WishlistEntry = {
  job: Job;
  createdAt: string;
};

/** 화면에 노출되는 사용자 정보. Supabase auth.users에서 뽑아 만든다. */
export type AppUser = {
  id: string;
  email: string;
  /** auth.users.user_metadata.nickname */
  nickname: string;
  /**
   * auth.users.user_metadata.role.
   * Phase 1 에 만들어진 계정에는 이 값이 없습니다. 없으면 'seeker' 로 봅니다 —
   * 기존 계정이 로그인했을 때 화면이 비는 것보다 구직자로 보이는 편이 낫습니다.
   */
  role: UserRole;
};

/** 역할. 가입 1단계에서 고르고, 이후 바꾸지 않습니다. */
export type UserRole = 'seeker' | 'employer';

/**
 * 구직자 프로필. seeker_profiles 테이블 1:1.
 *
 * avatarUrl 과 resumeUrl 은 지금 단계에서 항상 null 입니다.
 * 파일 업로드는 범위 밖이고, 화면은 이니셜 아바타로 그립니다.
 * 필드를 남겨 두는 이유는 나중에 Storage 만 붙이면 되게 하기 위해서입니다.
 */
export type SeekerProfile = {
  userId: string;
  /**
   * 가입 시 auth.users.user_metadata 에서 복사해 둡니다.
   * auth 스키마는 API 로 노출되지 않아서, 사업자가 지원자 이름을 읽으려면
   * 이 자리에 있어야 합니다.
   */
  nickname: string | null;
  /** 자기소개서. 가입 3단계에서 처음 받습니다. 최대 500자 */
  intro: string | null;
  /** 경력 (자유 서술) */
  experience: string | null;
  /** 관심 직종. Job.category 와 같은 값을 씁니다 */
  interests: string[];
  /** 희망 시급 (정수, 원 단위) */
  desiredWage: number | null;
  avatarUrl: string | null;
  resumeUrl: string | null;
  updatedAt: string;
  /**
   * MBTI. '선택 안 함'은 null 입니다.
   *
   * 아래 두 필드는 optional 입니다. 이 계약 커밋 직후에도, 아직 새 컬럼을
   * 매핑하지 않은 다른 브랜치의 mapper 가 그대로 컴파일돼야 하기 때문입니다.
   * 마이그레이션 전 행에서도 각각 null 과 [] 로 들어옵니다.
   */
  mbti?: Mbti | null;
  /** 성격 키워드. 최대 MAX_PERSONALITY_TRAITS 개 */
  personalityTraits?: PersonalityTrait[];
};

/** 허용되는 MBTI 16값. 자유 입력과 소문자는 저장하지 않습니다. */
export const MBTI_VALUES = [
  'INTJ',
  'INTP',
  'ENTJ',
  'ENTP',
  'INFJ',
  'INFP',
  'ENFJ',
  'ENFP',
  'ISTJ',
  'ISFJ',
  'ESTJ',
  'ESFJ',
  'ISTP',
  'ISFP',
  'ESTP',
  'ESFP',
] as const;

export type Mbti = (typeof MBTI_VALUES)[number];

/**
 * 성격 키워드 고정 목록. 자유 입력을 받지 않습니다 —
 * 검색·표기 통일·혐오 표현 필터가 필요 없는 가장 안전한 방식입니다.
 */
export const PERSONALITY_TRAITS = [
  '활발함',
  '소심함',
  '차분함',
  '성실함',
  '책임감',
  '친절함',
  '긍정적',
  '꼼꼼함',
  '협업형',
  '빠른 습득',
  '체력 좋음',
  '시간 약속',
] as const;

export type PersonalityTrait = (typeof PERSONALITY_TRAITS)[number];

/** 한 사람이 고를 수 있는 성격 키워드 최대 개수 */
export const MAX_PERSONALITY_TRAITS = 5;

/** applied = 지원함, viewed = 사업자가 열람, accepted = 채용, rejected = 거절 */
export type ApplicationStatus = 'applied' | 'viewed' | 'accepted' | 'rejected';

/** 구직자가 보는 내 지원 1건 */
export type MyApplication = {
  id: string;
  job: Job;
  message: string | null;
  status: ApplicationStatus;
  createdAt: string;
};

/** 사업자가 보는 지원자 1명 (지원서 + 공고 + 구직자 프로필 조인 결과) */
export type ApplicantEntry = {
  /** applications.id — setStatus 에 이 값을 넘깁니다 */
  id: string;
  status: ApplicationStatus;
  message: string | null;
  createdAt: string;
  job: Job;
  seeker: {
    id: string;
    nickname: string;
    /** 프로필을 아직 안 만든 지원자도 있습니다. 그때는 null */
    profile: SeekerProfile | null;
  };
};

/**
 * 인앱 알림 종류.
 * 이후 채팅·새 공고·채용 제안도 같은 테이블에 type 만 늘려서 붙입니다.
 */
export type NotificationType =
  | 'application_received'
  | 'application_viewed'
  | 'application_accepted'
  | 'application_rejected'
  // 사장님이 지원자를 오른쪽으로 넘김 → 구직자에게
  | 'employer_interested'
  // 양쪽 다 관심 → 양쪽에게
  | 'mutual_match'
  | 'system';

/**
 * 알림 1건.
 *
 * title 과 body 는 DB trigger 가 만듭니다. 클라이언트가 임의의 문구로
 * 알림을 발송할 수 없어야 하기 때문입니다.
 */
export type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  /** 확장 지점. 이동할 route params 같은 기능별 메타데이터가 들어갑니다 */
  payload: Record<string, unknown>;
  /** null 이면 읽지 않음 */
  readAt: string | null;
  createdAt: string;
  applicationId: string | null;
  jobId: string | null;
  /** 알림을 그릴 때 필요한 공고 최소 정보. 공고가 지워졌으면 null */
  job: { id: string; storeName: string; imageUrl: string | null } | null;
};

/** 근무 요일. DB 의 work_days 와 user_availability.day 가 쓰는 값입니다. */
export type Weekday = '월' | '화' | '수' | '목' | '금' | '일' | '토';

export const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'] as const;

/**
 * 구직자가 일할 수 있는 시간. 요일 하나당 구간 하나입니다.
 *
 * 시각을 "13:00" 문자열이 아니라 자정부터의 분으로 둡니다 —
 * 비교할 때마다 파싱하지 않아도 되고, 자정을 넘기는 구간(00:00~06:00)을
 * end 에 1440 을 더하는 것만으로 처리할 수 있습니다. 780 = 13 * 60.
 */
export type Availability = {
  day: Weekday;
  startMin: number;
  endMin: number;
};

/** 구인자가 지원자에게 보인 반응. right = 관심 있음, left = 관심 없음 */
export type OfferDirection = 'left' | 'right';

/** offers 테이블 한 행. 사장님 1명당 구직자 1명에 1행입니다. */
export type Offer = {
  employerId: string;
  seekerId: string;
  jobId: string | null;
  direction: OfferDirection;
  createdAt: string;
};

/** 지역 필터에 쓰는 시·도 17개. 화면의 칩 목록이 이 순서를 따릅니다. */
export const REGIONS = [
  '서울',
  '경기',
  '인천',
  '부산',
  '대구',
  '대전',
  '광주',
  '울산',
  '세종',
  '강원',
  '충북',
  '충남',
  '전북',
  '전남',
  '경북',
  '경남',
  '제주',
] as const;

export type Region = (typeof REGIONS)[number];
