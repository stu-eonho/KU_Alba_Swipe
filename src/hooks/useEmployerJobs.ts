/**
 * OWNER: 개발자 A (데이터/인증)
 *
 *   const { jobs, isLoading, isError, retry } = useMyJobs();          // 내 공고 목록
 *   const { createJob, isCreating, createError } = useCreateJob();    // 공고 올리기
 *
 * 사장님 전용입니다. employer_id 는 컬럼 default 가 auth.uid() 라
 * 클라이언트가 보내지 않습니다 — 보내면 RLS 의 with check 와 충돌할 여지가 생깁니다.
 */
import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createJob, fetchMyJobs, type NewJob } from '@/lib/api/jobs';
import { useAuth } from '@/lib/auth-context';

const MY_JOBS_KEY = ['jobs', 'mine'];

export function useMyJobs() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: MY_JOBS_KEY,
    queryFn: () => fetchMyJobs(user!.id),
    enabled: Boolean(user) && user?.role === 'employer',
  });

  return {
    jobs: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    retry: query.refetch,
  };
}

export function useCreateJob() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (input: NewJob) => createJob(input),
    onSuccess: () => {
      // 새 공고는 내 공고 목록과 구직자 덱 양쪽에 나타나야 합니다.
      // MY_JOBS_KEY 가 ['jobs','mine'] 이라 ['jobs'] 무효화가 접두사로 함께 잡습니다.
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
    onError: (error) => {
      console.error('[jobs] 공고 등록 실패:', error);
    },
  });

  const create = useCallback((input: NewJob) => mutation.mutateAsync(input), [mutation]);

  return { createJob: create, isCreating: mutation.isPending, createError: mutation.error };
}
