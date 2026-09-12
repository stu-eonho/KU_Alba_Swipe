/**
 * OWNER: 개발자 A (데이터/인증)
 *
 *   const { weights, topLabels, applySwipe, setInitial, reset } = usePreferences();
 *
 * B (F1 화면):
 *   - 초기 취향 선택 → setInitial(['cat:카페', 'time:오후'])
 *   - 취향 배너      → topLabels  (빈 배열이면 배너를 그리지 마세요)
 *   - "취향 초기화"  → reset()
 *
 * applySwipe 는 useDeck 이 알아서 부릅니다. B 가 직접 부를 일은 없습니다.
 *
 * CRITICAL: 저장은 비동기이고 실패해도 조용히 넘어갑니다.
 * 스와이프 체감이 이 앱의 전부라, 가중치 저장 때문에 카드가 늦게 날아가면
 * 추천이 잘 돌아도 앱이 싸구려로 보입니다. 실패한 갱신은 다음 스와이프에
 * 어차피 다시 올라갑니다.
 */
import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchPreferences, savePreferences } from '@/lib/api/preferences';
import { topPreferences, updateWeights, withInitialPicks, type Weights } from '@/lib/recommend';
import { useAuth } from '@/lib/auth-context';
import type { Job } from '@/types';

export function usePreferences() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const queryKey = ['preferences', user?.id];

  const query = useQuery({
    queryKey,
    queryFn: () => fetchPreferences(user!.id),
    enabled: Boolean(user),
    // 내가 스와이프할 때만 바뀝니다. 창을 옮길 때마다 다시 읽을 이유가 없습니다.
    staleTime: Infinity,
  });

  const weights = query.data ?? {};

  const persist = useMutation({
    mutationFn: (next: Weights) => savePreferences(user!.id, next),
    onError: (error) => {
      // 조용히 넘어갑니다. 다음 스와이프에 다시 저장됩니다.
      console.warn('[preferences] 저장 실패(무시):', error);
    },
  });

  /** 로컬 캐시를 먼저 바꾸고 서버에는 뒤따라 보냅니다. */
  const commit = useCallback(
    (next: Weights) => {
      queryClient.setQueryData<Weights>(queryKey, next);
      if (user) persist.mutate(next);
    },
    // queryKey 는 user?.id 로만 바뀌므로 의존성에 user 를 둡니다.
    [queryClient, persist, user], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const applySwipe = useCallback(
    (job: Job, direction: 'left' | 'right') => {
      const current = queryClient.getQueryData<Weights>(queryKey) ?? {};
      commit(updateWeights(current, job, direction));
    },
    [queryClient, queryKey, commit],
  );

  const setInitial = useCallback(
    (keys: string[]) => {
      const current = queryClient.getQueryData<Weights>(queryKey) ?? {};
      commit(withInitialPicks(current, keys));
    },
    [queryClient, queryKey, commit],
  );

  const reset = useCallback(() => commit({}), [commit]);

  return {
    weights,
    /** 가중치 상위 3개 라벨. 빈 배열이면 아직 학습된 게 없습니다 */
    topLabels: topPreferences(weights, 3),
    isLoading: query.isLoading,
    applySwipe,
    setInitial,
    reset,
  };
}
