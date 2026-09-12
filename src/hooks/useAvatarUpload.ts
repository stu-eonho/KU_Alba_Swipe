/**
 * OWNER: 개발자 A (데이터/인증)
 *
 *   const { upload, isUploading, uploadError } = useAvatarUpload();
 *   const url = await upload(file);   // public URL 을 돌려주고 프로필에도 저장까지 끝냅니다
 *
 * B: 5MB 초과나 이미지가 아닌 파일은 이 훅이 거부하고 Error 를 던집니다.
 *    message 가 사용자에게 보여줄 한국어라 그대로 토스트에 넣으면 됩니다.
 *
 * 경로는 avatars/{user_id}/avatar.<ext> 입니다. 폴더 첫 조각이 uid 라
 * Storage 정책이 남의 폴더 쓰기를 막습니다.
 */
import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { saveSeekerProfile } from '@/lib/api/profiles';
import { useAuth } from '@/lib/auth-context';

const BUCKET = 'avatars';
const MAX_BYTES = 5 * 1024 * 1024;

/** 확장자를 MIME 에서 뽑습니다. 파일 이름을 믿지 않습니다 — 확장자만 바꿔 올릴 수 있습니다. */
function extensionFor(type: string): string {
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  if (type === 'image/gif') return 'gif';
  return 'jpg';
}

export function useAvatarUpload() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const mutation = useMutation({
    mutationFn: async (file: File): Promise<string> => {
      if (!user) throw new Error('로그인이 필요해요');
      if (!file.type.startsWith('image/')) throw new Error('이미지 파일만 올릴 수 있어요');
      if (file.size > MAX_BYTES) throw new Error('5MB 이하 이미지만 올릴 수 있어요');

      const path = `${user.id}/avatar.${extensionFor(file.type)}`;

      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
        // 같은 사람이 사진을 바꾸면 덮어씁니다. 매번 새 파일을 쌓으면 버킷이 계속 커집니다.
        upsert: true,
        contentType: file.type,
        cacheControl: '3600',
      });
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from(BUCKET).getPublicUrl(path);

      // 같은 경로에 덮어썼기 때문에 URL 이 그대로입니다. 쿼리 문자열을 붙이지 않으면
      // 브라우저와 CDN 이 예전 사진을 계속 보여줍니다.
      const bustedUrl = `${publicUrl}?v=${Date.now()}`;

      await saveSeekerProfile(user.id, { avatarUrl: bustedUrl });
      return bustedUrl;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },

    onError: (error) => {
      console.error('[avatar] 업로드 실패:', error);
    },
  });

  const upload = useCallback((file: File) => mutation.mutateAsync(file), [mutation]);

  return { upload, isUploading: mutation.isPending, uploadError: mutation.error };
}
