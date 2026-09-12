/**
 * OWNER: 개발자 A (데이터/인증)
 *
 *   const { job, isLoading, isError, retry } = useJob(jobId);
 *
 * 공고 상세(/jobs/:jobId)가 쓰는 단건 조회입니다.
 *
 * CRITICAL: 덱 캐시(['jobs'])에서 찾아 쓰지 마세요. 상세에서 찜을 누르면
 * useDeck 이 그 공고를 덱 배열에서 낙관적으로 빼기 때문에, 보던 공고가
 * 화면에서 사라집니다. 이 쿼리는 ['job', id] 로 따로 살아 있어서 영향을 받지 않고,
 * 찜/해제 mutation 도 이 키를 지우지 않습니다.
 */
import { useQuery } from '@tanstack/react-query';
import { fetchJob } from '@/lib/api/jobs';

export function useJob(jobId?: string) {
  const query = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => fetchJob(jobId!),
    enabled: Boolean(jobId),
    // 공고 내용은 보는 동안 바뀌지 않습니다. 구인자가 고치면 ['jobs'] 무효화와
    // 함께 이 키도 접두사로 잡히지 않으므로, 상세를 다시 열 때 갱신됩니다.
    staleTime: 60_000,
  });

  return {
    job: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    retry: query.refetch,
  };
}
