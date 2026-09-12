/**
 * OWNER: 개발자 A (데이터/인증)
 *
 *   const { apply, isApplying } = useApply();
 *   await apply(job.id, message);
 *
 *   const { applications } = useMyApplications();   // 내 지원 현황 (채용/거절 확인)
 *
 * apply() 는 upsert 라 같은 공고에 두 번 눌러도 에러가 나지 않습니다.
 */
import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { applyToJob, fetchMyApplications } from '@/lib/api/applications';
import { useAuth } from '@/lib/auth-context';

export function useApply() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ jobId, message }: { jobId: string; message: string }) =>
      applyToJob(jobId, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
    onError: (error) => {
      console.error('[apply] 지원 실패:', error);
    },
  });

  const apply = useCallback(
    (jobId: string, message: string) => mutation.mutateAsync({ jobId, message }),
    [mutation],
  );

  return { apply, isApplying: mutation.isPending, applyError: mutation.error };
}

export function useMyApplications() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['applications', 'mine'],
    queryFn: fetchMyApplications,
    enabled: Boolean(user),
  });

  return {
    applications: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
