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
};
