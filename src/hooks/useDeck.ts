/**
 * OWNER: 개발자 A (데이터/인증)
 *
 * 개발자 B 가 덱 데이터를 얻는 유일한 통로입니다.
 *
 *   const { jobs, isLoading, isError, swipe } = useDeck();
 *   swipe(job.id, 'right');   // 찜
 *   swipe(job.id, 'left');    // 관심 없음
 *
 * CRITICAL: swipe() 는 낙관적입니다. 서버 응답을 기다리지 않고 이 훅이 즉시
 * ['jobs'] 캐시에서 그 공고를 빼기 때문에, B 는 카드를 날리는 애니메이션만 하면 됩니다.
 * 실패해도 카드를 되돌리지 않습니다 — 이미 다음 카드를 보고 있는데 앞 카드가
 * 되돌아오면 더 혼란스럽습니다. 실패는 swipeError 로 알리고 토스트만 띄웁니다.
 *
 * ['jobs'] 는 스와이프 후 무효화하지 않습니다. 이미 로컬에서 뺐으므로 재요청이 불필요하고,
 * 재요청하면 덱이 깜빡입니다.
 */
import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchDeckJobs } from '@/lib/api/jobs';
import { createSwipe } from '@/lib/api/swipes';
import { isCompatible } from '@/lib/availability';
import { sortByPreference } from '@/lib/recommend';
import { useAuth } from '@/lib/auth-context';
import { useAvailability } from '@/hooks/useAvailability';
import { usePreferences } from '@/hooks/usePreferences';
import type { Job, SwipeDirection } from '@/types';

export type DeckOptions = {
  /** 시간이 겹치지 않는 공고까지 전부 보여줍니다. B 의 "전체 보기" 버튼용 */
  includeIncompatible?: boolean;
  /** 시·도 이름 배열. 비어 있거나 없으면 전국입니다 */
  regions?: string[];
};

/** 덱과 카탈로그가 같은 캐시를 보도록 옵션을 한 곳에 둡니다. */
const JOBS_QUERY = {
  queryKey: ['jobs'] as const,
  queryFn: fetchDeckJobs,
  staleTime: 0,
};

/**
 * 필터도 정렬도 걸지 않은 전체 공고.
 *
 * 지역 시트가 "실제로 공고가 있는 구"를 뽑거나, 빈 상태를 "이 조건에 공고가
 * 아예 없다"로 판단할 때 씁니다.
 *
 * CRITICAL: 이 용도로 useDeck 을 한 번 더 부르지 마세요.
 * 같은 ['jobs'] 캐시라 네트워크 요청은 안 늘지만, useDeck 에는 스와이프 뮤테이션과
 * 취향 학습(usePreferences)이 딸려 있습니다. 지금은 swipe() 를 부르는 인스턴스가
 * 하나뿐이라 부수효과가 한 번만 돌지만, 훅에 효과를 하나만 더 넣으면
 * 두 번 도는 구조입니다. 카탈로그는 읽기만 하면 되므로 여기서 끊습니다.
 *
 * 취향 정렬도 걸지 않습니다 — 카탈로그 순서는 가중치에 따라 바뀔 이유가 없고,
 * 렌더마다 60건을 다시 정렬하는 건 낭비입니다.
 */
export function useJobCatalog() {
  const { user } = useAuth();

  const query = useQuery({ ...JOBS_QUERY, enabled: Boolean(user) });

  return {
    jobs: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
  };
}

export function useDeck(options: DeckOptions | boolean = {}) {
  // 예전 시그니처가 boolean 하나였습니다. 호출부를 한꺼번에 고치지 않아도 되게 받아 줍니다.
  const { includeIncompatible = false, regions } =
    typeof options === 'boolean' ? { includeIncompatible: options, regions: undefined } : options;

  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { availability, isLoading: isAvailabilityLoading } = useAvailability();
  const { weights, applySwipe } = usePreferences();

  const query = useQuery({ ...JOBS_QUERY, enabled: Boolean(user) });

  const mutation = useMutation({
    mutationFn: ({ jobId, direction }: { jobId: string; direction: SwipeDirection }) =>
      createSwipe(jobId, direction),

    onMutate: ({ jobId, direction }) => {
      // 응답을 기다리지 않고 덱에서 먼저 뺍니다. 체감 속도가 이 앱의 전부입니다.
      const swiped = queryClient.getQueryData<Job[]>(['jobs'])?.find((job) => job.id === jobId);

      queryClient.setQueryData<Job[]>(['jobs'], (jobs) =>
        (jobs ?? []).filter((job) => job.id !== jobId),
      );

      // 취향 학습. 저장은 뒤따라가고 실패해도 카드를 되돌리지 않습니다.
      if (swiped) applySwipe(swiped, direction);
    },

    onSuccess: () => {
      // 찜 목록은 바뀌었을 수 있으니 무효화합니다. 덱(['jobs'])은 건드리지 않습니다.
      queryClient.invalidateQueries({ queryKey: ['swipes'] });
    },

    onError: (error) => {
      console.error('[deck] 스와이프 저장 실패:', error);
    },
  });

  const swipe = useCallback(
    (jobId: string, direction: SwipeDirection) => {
      mutation.mutate({ jobId, direction });
    },
    [mutation],
  );

  const allJobs = query.data ?? [];

  // 지역이 먼저입니다. 사용자가 명시적으로 고른 조건이라, 시간이 맞아도
  // 다른 지역이면 애초에 볼 이유가 없습니다.
  const inRegion =
    regions && regions.length > 0 ? allJobs.filter((job) => regions.includes(job.region)) : allJobs;

  // 서버에서 거르지 않고 여기서 거릅니다. 공고가 수십 건이라 SQL 로 문자열을
  // 파싱하는 것보다 훨씬 싸고, 필터를 껐다 켜는 데 왕복이 없습니다.
  const compatible = inRegion.filter((job) => isCompatible(job, availability));
  const hiddenCount = inRegion.length - compatible.length;

  // 취향 점수 내림차순. 가중치가 비어 있으면 원래 순서를 그대로 둡니다.
  const ranked = sortByPreference(weights, includeIncompatible ? inRegion : compatible);

  return {
    jobs: ranked,
    /** 지역 필터로 걸러지고 남은 공고 수. "이 지역에 공고가 없어요" 판단에 쓰세요 */
    regionCount: inRegion.length,
    // 가능 시간을 읽는 중에 덱을 먼저 그리면, 숨겨질 공고가 한 번 보였다가 사라집니다.
    isLoading: query.isLoading || isAvailabilityLoading,
    isError: query.isError,
    /** 에러 화면의 "다시 시도" 버튼용 */
    retry: query.refetch,
    swipe,
    /** 스와이프 저장이 실패했을 때만 채워집니다. 토스트에만 쓰고 UI 를 되돌리지 마세요. */
    swipeError: mutation.error,
    /**
     * 내 가능 시간과 겹치지 않아 숨긴 공고 수.
     * 0 이면 안내 줄을 아예 그리지 마세요 — "0건을 숨겼어요"는 잡음입니다.
     */
    hiddenCount,
    /** 가능 시간을 등록한 사용자인지. 미등록이면 필터가 꺼져 있고 안내도 필요 없습니다 */
    hasAvailability: availability.length > 0,
  };
}
