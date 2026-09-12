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
import type { RatingInput } from '@/types';
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
    mutationFn: (input: RatingInput) => rateSeeker(seekerId!, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => {
      console.error('[rating] 평점 저장 실패:', error);
    },
  });

  /**
   * rate({ score, reasons, otherReason }) 가 정식 형태입니다.
   *
   * 숫자 하나만 넘기는 예전 호출도 당분간 받습니다 — 사유 UI 가 붙기 전까지
   * 점수만 저장하던 화면이 그대로 동작해야 합니다. 사유 칩이 올라오면 이 분기를
   * 지우세요.
   */
  const rate = useCallback(
    (input: RatingInput | number) =>
      mutation.mutateAsync(
        typeof input === 'number'
          ? { score: input as RatingInput['score'], reasons: [], otherReason: null }
          : input,
      ),
    [mutation],
  );

  return {
    /** 소수 1자리로 반올림한 평균. 평점이 없으면 0 — 화면은 0 이면 별점 줄을 숨기세요 */
    avg: Math.round(avg * 10) / 10,
    count,
    myScore: mine?.score ?? null,
    myComment: mine?.comment ?? null,
    /** 내가 고른 사유. 남의 사유는 넘기지 않습니다 — 평판이 아니라 뒷말이 됩니다 */
    myReasons: mine?.reasons ?? [],
    myOtherReason: mine?.otherReason ?? null,
    /** rate({ score, reasons, otherReason }) — 실패하면 draft 를 보존하고 throw 합니다 */
    rate,
    isRating: mutation.isPending,
    isLoading: query.isLoading,
    rateError: mutation.error,
  };
}
