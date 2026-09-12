/**
 * OWNER: 개발자 B (screen-composer)
 *
 * `@/hooks/useWishlist`, `@/hooks/useReviews`가 아직 개발자 A의 스텁이라
 * (호출하면 `throw new Error('TODO(A)')`) 화면을 끝까지 만들 수 없다.
 * 그래서 `MOCK_JOBS`에서 파생한 임시 찜 목록과 직접 쓴 리뷰 목데이터를 여기에 둔다.
 *
 * TODO(통합): A의 useWishlist 완성 시 교체
 *   const { entries, isLoading, isError, remove } = useMockWishlist();
 *     →  const { entries, isLoading, isError, remove } = useWishlist();
 *
 * TODO(통합): A의 useReviews 완성 시 교체
 *   const reviews = getMockReviews(job.id);
 *     →  const { reviews } = useReviews(job.id);
 *
 * 통합이 끝나면 이 파일을 통째로 삭제한다.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { MOCK_JOBS } from '@/features/deck/mockJobs';
import type { Job, Review, WishlistEntry } from '@/types';

/** 목 로딩 시간(ms). 격자 스켈레톤이 실제로 한 번 보이도록 짧게 준다. */
const MOCK_LOAD_MS = 400;

/** 찜한 것으로 가정할 공고 수 — 4개를 넘겨야 "세로 스크롤"이 검증된다 */
const WISHLISTED_COUNT = 6;

function isoDaysAgo(days: number): string {
  return new Date(Date.UTC(2026, 8, 12 - days, 9, 30, 0)).toISOString();
}

/** TODO(통합): A의 useWishlist 완성 시 교체 */
export const MOCK_WISHLIST_ENTRIES: WishlistEntry[] = MOCK_JOBS.slice(0, WISHLISTED_COUNT).map(
  (job, i) => ({ job, createdAt: isoDaysAgo(i) }),
);

/** TODO(통합): A의 useReviews 완성 시 교체 */
export const MOCK_REVIEWS: Review[] = [
  {
    id: 'rv-1-1',
    jobId: 'mock-1',
    authorName: '김하늘',
    rating: 5,
    content: '사장님이 정말 친절하세요. 음료 만드는 것도 처음부터 차근차근 알려주셔서 금방 적응했어요.',
    createdAt: isoDaysAgo(12),
  },
  {
    id: 'rv-1-2',
    jobId: 'mock-1',
    authorName: '이준서',
    rating: 4,
    content: '역에서 가까워서 통학하면서 하기 좋아요. 주말 오후는 조금 바쁜 편입니다.',
    createdAt: isoDaysAgo(25),
  },
  {
    id: 'rv-1-3',
    jobId: 'mock-1',
    authorName: '박서연',
    rating: 4,
    content: '시급도 괜찮고 음료도 챙겨주십니다. 다만 서서 하는 일이라 체력은 좀 필요해요.',
    createdAt: isoDaysAgo(40),
  },
  {
    id: 'rv-2-1',
    jobId: 'mock-2',
    authorName: '정민재',
    rating: 4,
    content: '점심 피크만 넘기면 여유롭습니다. 식사도 매번 챙겨주셔서 좋았어요.',
    createdAt: isoDaysAgo(9),
  },
  {
    id: 'rv-2-2',
    jobId: 'mock-2',
    authorName: '최유진',
    rating: 4,
    content: '주방 이모님들이 편하게 대해주십니다. 첫 알바로 나쁘지 않아요.',
    createdAt: isoDaysAgo(31),
  },
  {
    id: 'rv-3-1',
    jobId: 'mock-3',
    authorName: '오태현',
    rating: 4,
    content: '새벽에는 손님이 거의 없어서 과제하기 좋습니다. 대신 잠 패턴은 각오해야 해요.',
    createdAt: isoDaysAgo(6),
  },
  {
    id: 'rv-3-2',
    jobId: 'mock-3',
    authorName: '한지우',
    rating: 4,
    content: '야간수당이 붙어서 실수령이 생각보다 괜찮았습니다.',
    createdAt: isoDaysAgo(22),
  },
  {
    id: 'rv-4-1',
    jobId: 'mock-4',
    authorName: '서다영',
    rating: 5,
    content: '직원 할인이 생각보다 커요. 제품 공부도 되고 분위기도 밝습니다.',
    createdAt: isoDaysAgo(4),
  },
  {
    id: 'rv-4-2',
    jobId: 'mock-4',
    authorName: '윤채원',
    rating: 4,
    content: '진열 정리는 단순하지만 양이 많아요. 주말 저녁은 사람이 몰립니다.',
    createdAt: isoDaysAgo(18),
  },
  {
    id: 'rv-4-3',
    jobId: 'mock-4',
    authorName: '강도윤',
    rating: 4,
    content: '매니저님이 스케줄 조정을 잘 봐주셔서 시험기간에 도움이 많이 됐습니다.',
    createdAt: isoDaysAgo(35),
  },
  {
    id: 'rv-5-1',
    jobId: 'mock-5',
    authorName: '임세훈',
    rating: 4,
    content: '당일 지급이라 급할 때 좋습니다. 대신 하루 종일 서서 분류해야 해요.',
    createdAt: isoDaysAgo(3),
  },
  {
    id: 'rv-5-2',
    jobId: 'mock-5',
    authorName: '노은비',
    rating: 3,
    content: '일 자체는 단순한데 체력 소모가 큽니다. 편한 신발 꼭 챙기세요.',
    createdAt: isoDaysAgo(14),
  },
  {
    id: 'rv-6-1',
    jobId: 'mock-6',
    authorName: '조현우',
    rating: 4,
    content: '오픈이라 일찍 일어나야 하지만 오전만 하고 끝나서 하루가 길게 쓰여요.',
    createdAt: isoDaysAgo(7),
  },
  {
    id: 'rv-6-2',
    jobId: 'mock-6',
    authorName: '배수민',
    rating: 4,
    content: '손님이 몰리지 않아 차분하게 일할 수 있습니다. 음료도 제공됩니다.',
    createdAt: isoDaysAgo(27),
  },
  {
    id: 'rv-7-1',
    jobId: 'mock-7',
    authorName: '신가온',
    rating: 5,
    content: '조리 경험이 없어도 알려주시는 대로만 하면 됩니다. 식사가 정말 잘 나와요.',
    createdAt: isoDaysAgo(5),
  },
  {
    id: 'rv-7-2',
    jobId: 'mock-7',
    authorName: '문지호',
    rating: 4,
    content: '점심 저녁 피크는 정신없지만 그 외 시간은 여유롭습니다.',
    createdAt: isoDaysAgo(20),
  },
  {
    id: 'rv-8-1',
    jobId: 'mock-8',
    authorName: '황리안',
    rating: 5,
    content: '앉아 있는 시간이 많아서 알바 중 제일 편했어요. 조용한 걸 좋아하면 추천합니다.',
    createdAt: isoDaysAgo(2),
  },
  {
    id: 'rv-8-2',
    jobId: 'mock-8',
    authorName: '권나현',
    rating: 4,
    content: '좌석 정리와 간단한 청소가 있습니다. 그 외에는 거의 카운터에 있어요.',
    createdAt: isoDaysAgo(16),
  },
  {
    id: 'rv-8-3',
    jobId: 'mock-8',
    authorName: '천유나',
    rating: 5,
    content: '사장님이 시험기간에 스케줄을 유연하게 빼주셔서 좋았습니다.',
    createdAt: isoDaysAgo(29),
  },
];

/** 카드 뒷면에 노출할 리뷰. 스펙 <back_face>가 "리뷰 카드 2~3개"로 못박아 3개에서 자른다. */
export const MAX_REVIEWS_ON_BACK = 3;

/** TODO(통합): A의 useReviews 완성 시 교체 */
export function getMockReviews(jobId: string): Review[] {
  return MOCK_REVIEWS.filter((r) => r.jobId === jobId).slice(0, MAX_REVIEWS_ON_BACK);
}

export function findMockJob(jobId: string | undefined): Job | undefined {
  if (!jobId) return undefined;
  return MOCK_JOBS.find((j) => j.id === jobId);
}

export type MockWishlist = {
  entries: WishlistEntry[];
  isLoading: boolean;
  isError: boolean;
  /** 낙관적 제거. 되돌리기를 위해 원래 위치를 복원하는 함수를 돌려준다. */
  remove: (jobId: string) => () => void;
};

/**
 * TODO(통합): A의 useWishlist 완성 시 교체
 *
 * A의 훅과 반환 모양을 맞춰 두었다(entries / isLoading / isError / remove).
 * 다만 A의 remove는 서버 UPDATE를 하고 void를 돌려줄 가능성이 높으므로,
 * 되돌리기 토스트는 그때 다시 판단한다.
 */
export function useMockWishlist(): MockWishlist {
  const [entries, setEntries] = useState<WishlistEntry[]>(MOCK_WISHLIST_ENTRIES);
  const [isLoading, setIsLoading] = useState(true);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    timer.current = window.setTimeout(() => setIsLoading(false), MOCK_LOAD_MS);
    return () => window.clearTimeout(timer.current);
  }, []);

  const remove = useCallback((jobId: string) => {
    let removedAt = -1;
    let removed: WishlistEntry | undefined;

    setEntries((prev) => {
      const index = prev.findIndex((e) => e.job.id === jobId);
      if (index === -1) return prev;
      removedAt = index;
      removed = prev[index];
      return [...prev.slice(0, index), ...prev.slice(index + 1)];
    });

    // 되돌리기: 원래 자리에 다시 꽂는다. 맨 뒤에 붙이면 격자 순서가 흔들린다.
    return () => {
      if (!removed || removedAt < 0) return;
      const restored = removed;
      const at = removedAt;
      setEntries((prev) => {
        if (prev.some((e) => e.job.id === restored.job.id)) return prev;
        return [...prev.slice(0, at), restored, ...prev.slice(at)];
      });
    };
  }, []);

  return { entries, isLoading, isError: false, remove };
}
