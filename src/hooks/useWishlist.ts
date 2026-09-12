/**
 * OWNER: 개발자 A (데이터/인증)
 *
 *   const { entries, count, isLoading, isError, remove } = useWishlist();
 *   remove(job.id);   // 찜 해제 (격자에서 즉시 사라집니다)
 *
 * count 는 하단 탭바의 찜 개수 배지에 쓰세요.
 * 해제는 낙관적이며, 실패하면 원래대로 되돌립니다 — 덱과 달리 여기서는 항목이
 * 제자리로 돌아오는 게 자연스럽습니다.
 */
import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchWishlist, unwishlist } from '@/lib/api/swipes';
import { useAuth } from '@/lib/auth-context';
import type { WishlistEntry } from '@/types';

export function useWishlist() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['swipes'],
    queryFn: fetchWishlist,
    enabled: Boolean(user),
  });

  const mutation = useMutation({
    mutationFn: (jobId: string) => unwishlist(jobId),

    onMutate: async (jobId) => {
      // 진행 중인 재요청이 낙관적 결과를 덮어쓰지 않도록 먼저 멈춥니다.
      await queryClient.cancelQueries({ queryKey: ['swipes'] });
      const previous = queryClient.getQueryData<WishlistEntry[]>(['swipes']);
      queryClient.setQueryData<WishlistEntry[]>(['swipes'], (entries) =>
        (entries ?? []).filter((entry) => entry.job.id !== jobId),
      );
      return { previous };
    },

    onError: (error, _jobId, context) => {
      console.error('[wishlist] 찜 해제 실패:', error);
      if (context?.previous) queryClient.setQueryData(['swipes'], context.previous);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['swipes'] });
    },
  });

  const remove = useCallback(
    (jobId: string) => {
      mutation.mutate(jobId);
    },
    [mutation],
  );

  const entries = query.data ?? [];

  return {
    entries,
    count: entries.length,
    isLoading: query.isLoading,
    isError: query.isError,
    retry: query.refetch,
    remove,
    removeError: mutation.error,
  };
}
