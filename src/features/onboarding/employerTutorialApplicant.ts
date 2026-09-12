/**
 * 구인자 인터랙티브 튜토리얼에서만 보이는 가상 지원자입니다.
 *
 * DB 행이나 Auth 계정을 만들지 않습니다. 튜토리얼이 열린 동안 화면의 덱 배열 앞에만
 * 삽입하고, 스와이프하거나 튜토리얼이 닫히면 배열에서 제거합니다. 따라서 offers·알림·
 * 평점·실제 지원자 목록을 오염시키지 않습니다.
 */
import type { ApplicantEntry } from '@/types';

// 평점 훅이 UUID 컬럼을 조회하므로 형식도 UUID로 맞춘다. 실제 DB에는 없는 예약값이다.
export const EMPLOYER_TUTORIAL_SEEKER_ID = '00000000-0000-4000-8000-000000000011';

export function createEmployerTutorialApplicant(): ApplicantEntry {
  return {
    id: '00000000-0000-4000-8000-000000000012',
    status: 'applied',
    message:
      '카페 아르바이트 경험이 있어 주문과 음료 제조 업무에 익숙합니다. 밝게 인사하며 성실하게 근무하겠습니다.',
    createdAt: new Date().toISOString(),
    job: {
      id: '00000000-0000-4000-8000-000000000013',
      storeName: '내 공고 예시',
      category: '카페',
      hourlyWage: 12_000,
      summary: '주말 카페 스태프를 구해요',
      description: '주문 응대와 음료 제조를 함께해요.',
      address: '서울 성북구 안암로',
      region: '서울',
      workDays: '토·일',
      workHours: '12:00 ~ 18:00',
      benefits: ['식사 제공', '주휴수당'],
      rating: 4.8,
      reviewCount: 12,
      imageUrl: null,
      employerId: null,
      wantedTraits: ['성실함', '친절함'],
    },
    seeker: {
      id: EMPLOYER_TUTORIAL_SEEKER_ID,
      nickname: '김예시',
      profile: {
        userId: EMPLOYER_TUTORIAL_SEEKER_ID,
        nickname: '김예시',
        intro:
          '안녕하세요! 손님을 밝게 맞이하고 맡은 일을 끝까지 책임지는 지원자입니다. 새로운 메뉴와 업무도 빠르게 배우겠습니다.',
        experience: '개인 카페에서 주문 응대와 음료 제조 8개월',
        interests: ['카페', '음식점'],
        desiredWage: 12_000,
        avatarUrl: null,
        resumeUrl: null,
        updatedAt: new Date().toISOString(),
        mbti: 'ENFJ',
        personalityTraits: ['활발함', '성실함', '친절함'],
      },
    },
  };
}
