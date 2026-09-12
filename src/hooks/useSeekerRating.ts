/**
 * OWNER: 개발자 A (데이터/인증)
 *
 *   const { avg, count, myScore, myComment, rate, isRating } = useSeekerRating(seeker.id);
 *   await rate(4, '성실했어요');
 *
 * rate() 는 upsert 입니다. 사장님 1명당 지원자 1명에 1행이고, 다시 매기면 덮어씁니다.
 *
 * RLS 가 "내 공고에 지원한 사람"에게만 쓰기를 허용합니다. 아무에게나 평점을
 * 남길 수 없고, 그 검사는 화면이 아니라 DB 가 합니다.
 */
import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchSeekerRatings, rateSeeker } from '@/lib/api/ratings';
import { useAuth } from '@/lib/auth-context';

export function useSeekerRating(seekerId?: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const queryKey = ['seeker-ratings', seekerId];

  const query = useQuery({
    queryKey,
    queryFn: () => fetchSeekerRatings(seekerId!),
    enabled: Boolean(user) && Boolean(seekerId),
  });

  const ratings = query.data ?? [];
  const count = ratings.length;
  const avg = count === 0 ? 0 : ratings.reduce((sum, entry) => sum + entry.score, 0) / count;
  const mine = ratings.find((entry) => entry.employerId === user?.id) ?? null;

  const mutation = useMutation({
    mutationFn: ({ score, comment }: { score: number; comment?: string }) =>
      rateSeeker(seekerId!, score, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => {
      console.error('[rating] 평점 저장 실패:', error);
    },
  });

  const rate = useCallback(
    (score: number, comment?: string) => mutation.mutateAsync({ score, comment }),
    [mutation],
  );

  return {
    /** 소수 1자리로 반올림한 평균. 평점이 없으면 0 — 화면은 0 이면 별점 줄을 숨기세요 */
    avg: Math.round(avg * 10) / 10,
    count,
    myScore: mine?.score ?? null,
    myComment: mine?.comment ?? null,
    rate,
    isRating: mutation.isPending,
    isLoading: query.isLoading,
    rateError: mutation.error,
  };
}
