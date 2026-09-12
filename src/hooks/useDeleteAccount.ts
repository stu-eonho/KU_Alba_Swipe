/**
 * OWNER: 개발자 A (데이터/인증)
 *
 *   const { deleteAccount, isDeleting } = useDeleteAccount();
 *   await deleteAccount();          // 성공하면 이미 로그아웃 상태입니다
 *   navigate('/login', { replace: true });
 *
 * Supabase 는 anon key 로 자기 계정을 지울 수 없습니다 (auth.admin 은 service_role 전용).
 * DB 의 security definer 함수 delete_own_account() 를 부릅니다 —
 * 그 함수가 auth.uid() 로 본인 행만 지웁니다.
 *
 * 연결된 데이터(프로필·스와이프·지원서·제안·가능시간·알림·평점)는 전부
 * auth.users 를 on delete cascade 로 참조하므로 함께 사라집니다.
 */
import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  const { signOut } = useAuth();

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('delete_own_account');
      if (error) throw error;

      // 계정이 사라졌으니 남은 토큰은 쓸 수 없습니다. 로컬 세션과 캐시를 비웁니다.
      await signOut();
      queryClient.clear();
    },
    onError: (error) => {
      console.error('[account] 탈퇴 실패:', error);
    },
  });

  const deleteAccount = useCallback(() => mutation.mutateAsync(), [mutation]);

  return {
    deleteAccount,
    isDeleting: mutation.isPending,
    deleteError: mutation.error,
  };
}
