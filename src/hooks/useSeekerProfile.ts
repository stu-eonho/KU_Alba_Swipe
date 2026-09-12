/**
 * OWNER: 개발자 A (데이터/인증)
 *
 *   const { profile, isLoading, save, isSaving } = useSeekerProfile();        // 본인
 *   const { profile, isLoading } = useSeekerProfile(applicant.seeker.id);     // 사업자가 지원자를 볼 때
 *
 * 남의 프로필을 볼 때 save() 를 부르지 마세요. RLS 가 막지만 화면에서 버튼을 안 보이게 하는 게 먼저입니다.
 * avatarUrl 과 resumeUrl 은 항상 null 입니다 — 파일 업로드는 범위 밖이고, 필드만 남겨 뒀습니다.
 */
import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchSeekerProfile, saveSeekerProfile, type SeekerProfilePatch } from '@/lib/api/profiles';
import { useAuth } from '@/lib/auth-context';

export function useSeekerProfile(userId?: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const targetId = userId ?? user?.id ?? '';
  const isOwn = Boolean(user && targetId === user.id);

  const query = useQuery({
    queryKey: ['profile', targetId],
    queryFn: () => fetchSeekerProfile(targetId),
    enabled: Boolean(targetId),
  });

  const mutation = useMutation({
    mutationFn: (patch: SeekerProfilePatch) => {
      if (!isOwn) throw new Error('본인 프로필만 저장할 수 있습니다.');
      return saveSeekerProfile(targetId, patch);
    },
    onSuccess: (saved) => {
      // 서버가 돌려준 행을 그대로 캐시에 넣습니다. 저장 직후 재요청이 필요 없습니다.
      queryClient.setQueryData(['profile', targetId], saved);
    },
    onError: (error) => {
      console.error('[profile] 저장 실패:', error);
    },
  });

  const save = useCallback((patch: SeekerProfilePatch) => mutation.mutateAsync(patch), [mutation]);

  return {
    profile: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    isOwn,
    save,
    isSaving: mutation.isPending,
  };
}
