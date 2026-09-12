/**
 * OWNER: 개발자 A (데이터/인증)
 *
 *   const { applications, isLoading, isError, setStatus } = useEmployerApplicants();
 *   const { applications } = useEmployerApplicants(jobId);   // 특정 공고만
 *
 *   setStatus(entry.id, 'accepted');   // 첫 인자는 applications.id (지원자 id 아님)
 *
 * 상태 변경은 낙관적입니다. 목록에서 "채용"을 눌렀을 때 배지가 바로 바뀌지 않으면
 * 누른 게 먹혔는지 알 수 없습니다. 실패하면 되돌리고 콘솔에 남깁니다.
 */
import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchEmployerApplicants, setApplicationStatus } from '@/lib/api/applications';
import { useAuth } from '@/lib/auth-context';
import type { ApplicantEntry, ApplicationStatus } from '@/types';

export function useEmployerApplicants(jobId?: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const queryKey = ['applications', 'employer', jobId ?? 'all'];

  const query = useQuery({
    queryKey,
    queryFn: () => fetchEmployerApplicants(jobId),
    // 구인자 계정에서만 의미가 있습니다. 구직자로 부르면 RLS 가 빈 배열을 돌려줍니다.
    enabled: Boolean(user) && user?.role === 'employer',
  });

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ApplicationStatus }) =>
      setApplicationStatus(id, status),

    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ApplicantEntry[]>(queryKey);
      queryClient.setQueryData<ApplicantEntry[]>(queryKey, (entries) =>
        (entries ?? []).map((entry) => (entry.id === id ? { ...entry, status } : entry)),
      );
      return { previous };
    },

    onError: (error, _variables, context) => {
      console.error('[employer] 상태 변경 실패:', error);
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },

    onSettled: () => {
      // 구직자 쪽 "내 지원 현황"도 같이 갱신되도록 접두사로 무효화합니다.
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });

  const setStatus = useCallback(
    (id: string, status: ApplicationStatus) => {
      mutation.mutate({ id, status });
    },
    [mutation],
  );

  return {
    applications: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    retry: query.refetch,
    setStatus,
  };
}
