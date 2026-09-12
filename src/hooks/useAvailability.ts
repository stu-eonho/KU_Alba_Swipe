/**
 * OWNER: 개발자 A (데이터/인증)
 *
 *   const { availability, isLoading, save, isSaving } = useAvailability();
 *   await save([{ day: '월', startMin: 780, endMin: 1080 }, ...]);
 *
 * save() 는 전체 교체입니다. 넘긴 목록에 없는 요일은 지웁니다 —
 * 화면이 "월·수·금"에서 "월·금"으로 바뀌면 수요일은 사라져야 합니다.
 */
import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAvailability, replaceAvailability } from '@/lib/api/availability';
import { useAuth } from '@/lib/auth-context';
import type { Availability } from '@/types';

export function useAvailability(userId?: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const targetId = userId ?? user?.id ?? '';

  const query = useQuery({
    queryKey: ['availability', targetId],
    queryFn: () => fetchAvailability(targetId),
    enabled: Boolean(targetId),
  });

  const mutation = useMutation({
    mutationFn: (list: Availability[]) => replaceAvailability(targetId, list),
    onSuccess: (saved) => {
      queryClient.setQueryData(['availability', targetId], saved);
      // 덱 필터가 이 값을 쓰므로 공고 목록도 다시 계산되게 합니다.
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
    onError: (error) => {
      console.error('[availability] 저장 실패:', error);
    },
  });

  const save = useCallback((list: Availability[]) => mutation.mutateAsync(list), [mutation]);

  return {
    availability: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    save,
    isSaving: mutation.isPending,
    saveError: mutation.error,
  };
}
