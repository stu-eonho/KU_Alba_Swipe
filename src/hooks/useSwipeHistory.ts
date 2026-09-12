/**
 * OWNER: 개발자 A (데이터/인증)
 *
 * 설정 화면 전용 훅 두 개입니다. 덱·찜과 달리 B 는 쓸 일이 없습니다.
 *
 * queryKey 는 ['swipes', 'stats'] 입니다. 새 최상위 키가 아니라 ['swipes'] 의 하위 키라서,
 * 기존 invalidateQueries({ queryKey: ['swipes'] }) 가 접두사 일치로 이것까지 함께 무효화합니다.
 * 스와이프 한 번에 통계 숫자가 알아서 따라옵니다.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchSwipeStats, resetSwipes } from '@/lib/api/swipes';
import { useAuth } from '@/lib/auth-context';

export function useSwipeStats() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['swipes', 'stats'],
    queryFn: fetchSwipeStats,
    enabled: Boolean(user),
  });

  return {
    stats: query.data ?? { seen: 0, liked: 0 },
    isLoading: query.isLoading,
  };
}

/**
 * 스와이프 기록 초기화. 데모 리허설의 생명줄입니다.
 * 성공하면 덱과 찜 목록 캐시를 모두 비워 공고를 처음부터 다시 보게 만듭니다.
 */
export function useResetSwipes() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('로그인이 필요합니다.');
      await resetSwipes(user.id);
    },
    onSuccess: () => {
      // 여기서는 ['jobs'] 도 무효화합니다. 스와이프 때와 달리 덱 전체가 되살아나야 합니다.
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['swipes'] });
    },
    onError: (error) => {
      console.error('[settings] 기록 초기화 실패:', error);
    },
  });

  return {
    reset: mutation.mutateAsync,
    isResetting: mutation.isPending,
  };
}
