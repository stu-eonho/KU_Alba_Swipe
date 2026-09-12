/**
 * OWNER: 개발자 A (데이터/인증)
 *
 *   // 지원 화면 / 카드 뒷면 — jobId 를 주면 이미 지원했는지도 함께 봅니다
 *   const { existingApplication, isChecking, isCheckError, retryCheck, apply, isApplying, applyError }
 *     = useApply(job.id);
 *
 *   const { applications, isLoading, isError } = useMyApplications();   // 지원 현황 목록
 *   const { application, isLoading, isError } = useMyApplication(id);   // 지원 상세
 *
 * CTA 규칙:
 *   isChecking            → 버튼 비활성 ("확인 중")
 *   isCheckError          → 버튼 비활성 + "지원 여부를 확인하지 못했어요" + retryCheck
 *   existingApplication   → 폼 대신 "지원 완료" + 상세 보기
 *   그 외                 → 지원 폼
 *
 * CRITICAL: 확인에 실패했을 때 낙관적으로 제출시키지 마세요.
 * 중복이면 서버가 막아 주긴 하지만, 그 경로로 가면 사용자는 눌러본 뒤에야 압니다.
 */
import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  applyToJob,
  fetchMyApplication,
  fetchMyApplicationByJob,
  fetchMyApplications,
} from '@/lib/api/applications';
import { AlreadyAppliedError } from '@/lib/api/errors';
import { useAuth } from '@/lib/auth-context';

export function useApply(jobId?: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const check = useQuery({
    queryKey: ['applications', 'by-job', jobId],
    queryFn: () => fetchMyApplicationByJob(jobId!),
    enabled: Boolean(user) && Boolean(jobId),
  });

  const mutation = useMutation({
    mutationFn: ({ jobId: targetJobId, message }: { jobId: string; message: string }) =>
      applyToJob(targetJobId, message),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      // 알림은 DB trigger 가 만듭니다. 방금 생긴 것을 바로 보여주려면 다시 물어봐야 합니다.
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },

    onError: (error) => {
      // 중복 지원은 실패가 아니라 정상 분기입니다. 콘솔에 error 로 남기지 않습니다.
      if (error instanceof AlreadyAppliedError) {
        // 다른 탭에서 이미 냈을 수 있으니 실제 상태를 다시 읽어 화면을 수렴시킵니다.
        queryClient.invalidateQueries({ queryKey: ['applications'] });
        return;
      }
      console.error('[apply] 지원 실패:', error);
    },
  });

  const apply = useCallback(
    (targetJobId: string, message: string) => mutation.mutateAsync({ jobId: targetJobId, message }),
    [mutation],
  );

  return {
    /** 이미 낸 지원서. null 이면 아직 지원 전 */
    existingApplication: check.data ?? null,
    isChecking: check.isLoading,
    isCheckError: check.isError,
    retryCheck: check.refetch,
    apply,
    isApplying: mutation.isPending,
    applyError: mutation.error,
    /** 이번 실패가 "이미 지원함" 인지. 에러 토스트 대신 안내 토스트를 띄우세요 */
    isAlreadyApplied: mutation.error instanceof AlreadyAppliedError,
  };
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
    retry: query.refetch,
  };
}

/**
 * 지원 상세. 없는 id 든 남의 id 든 똑같이 null 이 나옵니다 —
 * 화면은 두 경우를 구분하지 않는 공통 not-found 를 보여주세요.
 */
export function useMyApplication(applicationId?: string) {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['applications', 'detail', applicationId],
    queryFn: () => fetchMyApplication(applicationId!),
    enabled: Boolean(user) && Boolean(applicationId),
  });

  return {
    application: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    retry: query.refetch,
  };
}
