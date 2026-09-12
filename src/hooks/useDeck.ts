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
import { useAuth } from '@/lib/auth-context';
import { useAvailability } from '@/hooks/useAvailability';
import type { Job, SwipeDirection } from '@/types';

/**
 * @param includeIncompatible 시간이 겹치지 않는 공고까지 전부 보여줍니다.
 *        B 의 "전체 보기" 버튼이 이 값을 true 로 넘깁니다.
 */
export function useDeck(includeIncompatible = false) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { availability, isLoading: isAvailabilityLoading } = useAvailability();

  const query = useQuery({
    queryKey: ['jobs'],
    queryFn: fetchDeckJobs,
    enabled: Boolean(user),
    staleTime: 0,
  });

  const mutation = useMutation({
    mutationFn: ({ jobId, direction }: { jobId: string; direction: SwipeDirection }) =>
      createSwipe(jobId, direction),

    onMutate: ({ jobId }) => {
      // 응답을 기다리지 않고 덱에서 먼저 뺍니다. 체감 속도가 이 앱의 전부입니다.
      queryClient.setQueryData<Job[]>(['jobs'], (jobs) =>
        (jobs ?? []).filter((job) => job.id !== jobId),
      );
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

  // 서버에서 거르지 않고 여기서 거릅니다. 공고가 25건뿐이라 SQL 로 문자열을
  // 파싱하는 것보다 훨씬 싸고, 필터를 껐다 켜는 데 왕복이 없습니다.
  const compatible = allJobs.filter((job) => isCompatible(job, availability));
  const hiddenCount = allJobs.length - compatible.length;

  return {
    jobs: includeIncompatible ? allJobs : compatible,
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
