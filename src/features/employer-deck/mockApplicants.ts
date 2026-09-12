/**
 * OWNER: 개발자 B (deck-interaction) — 단독 소유
 *
 * ⚠️ 통합 후 삭제할 파일입니다.
 * 개발자 A의 `useApplicantDeck()` 훅이 오면 이 파일을 지우고, 페이지에서
 * `entries={MOCK_APPLICANTS}` 를 `entries={applicants}` 로 바꾸면 끝입니다.
 * 이 파일을 import 하는 곳은 `src/pages/EmployerHeldPage.tsx` 하나뿐입니다.
 *
 * 개발 중 레이아웃이 깨지는 경우를 전부 덮도록 4명을 섞어 두었습니다:
 *   1) 자기소개가 아주 긴 사람   2) 자기소개가 한 줄인 사람
 *   3) profile 이 null 인 사람    4) 칩이 가득 찬 사람
 */
import type { ApplicantEntry, Job } from '@/types';

function mockJob(id: string, storeName: string, category: string, hourlyWage: number): Job {
  return {
    id,
    storeName,
    category,
    hourlyWage,
    summary: '홀 서빙과 간단한 마감 정리를 함께 합니다',
    description: '주 3일, 성실하신 분을 찾습니다.',
    address: '서울 성북구 안암로 145',
    workDays: '월·수·금',
    workHours: '13:00 ~ 18:00',
    benefits: ['식사제공', '주휴수당'],
    rating: 4.3,
    reviewCount: 3,
    imageUrl: null,
    employerId: 'mock-employer',
  };
}

export const MOCK_APPLICANTS: ApplicantEntry[] = [
  {
    id: 'mock-app-1',
    status: 'applied',
    message: '성실히 하겠습니다!',
    createdAt: '2026-09-12T02:10:00.000Z',
    job: mockJob('mock-job-1', '안암 커피하우스', '카페', 11000),
    seeker: {
      id: 'mock-seeker-1',
      nickname: '김하늘',
      profile: {
        userId: 'mock-seeker-1',
        nickname: '김하늘',
        intro:
          '안녕하세요! 고려대학교 경영학과 3학년 김하늘입니다. 2년 동안 카페에서 바리스타로 일하며 에스프레소 추출과 라떼아트를 익혔고, 주말 피크 타임에 하루 200잔 이상을 안정적으로 처리해 본 경험이 있습니다. 손님 응대를 즐기는 편이라 단골손님 이름과 취향을 외워 두는 일에 보람을 느낍니다. 마감 정산과 재고 발주도 맡아 본 적이 있어 사장님께서 매장을 비우셔도 안심하실 수 있도록 돕고 싶습니다. 학기 중에는 월·수·금 오후, 방학에는 요일 조정이 가능합니다.',
        experience: '스타벅스 안암점 1년 6개월 · 개인 카페 8개월',
        interests: ['카페', '판매', '사무'],
        desiredWage: 11500,
        avatarUrl: null,
        resumeUrl: null,
        updatedAt: '2026-09-10T00:00:00.000Z',
        mbti: 'ENFP',
        personalityTraits: ['활발함', '친절함', '빠른 습득'],
      },
    },
  },
  {
    id: 'mock-app-2',
    status: 'applied',
    message: null,
    createdAt: '2026-09-11T08:00:00.000Z',
    job: mockJob('mock-job-2', '참살이 분식', '음식점', 10500),
    seeker: {
      id: 'mock-seeker-2',
      nickname: '박도윤',
      profile: {
        userId: 'mock-seeker-2',
        nickname: '박도윤',
        intro: '체력 하나는 자신 있습니다. 열심히 배우겠습니다.',
        experience: null,
        interests: ['주방'],
        desiredWage: null,
        avatarUrl: null,
        resumeUrl: null,
        updatedAt: '2026-09-09T00:00:00.000Z',
        mbti: 'ISTJ',
        personalityTraits: ['성실함'],
      },
    },
  },
  {
    id: 'mock-app-3',
    status: 'viewed',
    message: null,
    createdAt: '2026-09-10T23:30:00.000Z',
    job: mockJob('mock-job-1', '안암 커피하우스', '카페', 11000),
    // 프로필을 아직 안 만든 지원자 — 카드가 깨지지 않는지 확인용
    seeker: { id: 'mock-seeker-3', nickname: '이서준', profile: null },
  },
  {
    id: 'mock-app-4',
    status: 'applied',
    message: '주말에도 가능합니다',
    createdAt: '2026-09-09T11:45:00.000Z',
    job: mockJob('mock-job-3', '고대앞 편의점', '편의점', 10300),
    seeker: {
      id: 'mock-seeker-4',
      nickname: '최유나',
      profile: {
        userId: 'mock-seeker-4',
        nickname: '최유나',
        intro:
          '야간 근무 경험이 많아 새벽 시간대도 무리 없이 근무할 수 있습니다. 포스기 사용과 발주 업무 모두 익숙합니다.',
        experience: 'CU 제기동점 1년 (야간)',
        interests: ['편의점', '판매', '물류', '배달'],
        desiredWage: 10800,
        avatarUrl: null,
        resumeUrl: null,
        updatedAt: '2026-09-08T00:00:00.000Z',
        mbti: 'INTJ',
        personalityTraits: ['꼼꼼함', '책임감', '시간 약속', '체력 좋음'],
      },
    },
  },
];
