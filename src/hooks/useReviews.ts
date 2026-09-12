/**
 * OWNER: 개발자 A (데이터/인증)
 *
 *   const { reviews, isLoading } = useReviews(job.id);
 *
 * 카드 뒷면이 열릴 때만 부르세요. jobId 가 비어 있으면 요청하지 않습니다.
 * 세션 안에서 리뷰는 바뀌지 않으므로 staleTime 은 Infinity 입니다 —
 * 카드를 여닫을 때마다 다시 요청하면 뒤집기 애니메이션 중에 화면이 덜컹입니다.
 */
import { useQuery } from '@tanstack/react-query';
import { fetchReviews } from '@/lib/api/jobs';

export function useReviews(jobId: string) {
  const query = useQuery({
    queryKey: ['reviews', jobId],
    queryFn: () => fetchReviews(jobId),
    enabled: Boolean(jobId),
    staleTime: Infinity,
  });

  return {
    reviews: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
