/**
 * OWNER: 개발자 A (데이터/인증)
 *
 *   const { upload, isUploading, uploadError } = useJobImageUpload();
 *   const url = await upload(file);   // public URL. 공고 작성 폼의 imageUrl 에 넣으세요
 *
 * 아바타와 같은 방식이지만 한 가지가 다릅니다: 아바타는 사람당 파일 하나라
 * 같은 경로에 덮어썼는데, 공고는 여러 개라 매번 새 이름을 만듭니다.
 * 그래서 캐시 무력화용 ?v= 가 필요 없습니다.
 *
 * B: 5MB 초과나 이미지가 아닌 파일은 훅이 거부하고 Error 를 던집니다.
 *    message 가 그대로 쓸 수 있는 한국어입니다.
 */
import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

const BUCKET = 'job-images';
const MAX_BYTES = 5 * 1024 * 1024;

/** 확장자는 MIME 에서 뽑습니다. 파일 이름은 바꿔 올릴 수 있어서 믿지 않습니다. */
function extensionFor(type: string): string {
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  if (type === 'image/gif') return 'gif';
  return 'jpg';
}

export function useJobImageUpload() {
  const { user } = useAuth();

  const mutation = useMutation({
    mutationFn: async (file: File): Promise<string> => {
      if (!user) throw new Error('로그인이 필요해요');
      if (!file.type.startsWith('image/')) throw new Error('이미지 파일만 올릴 수 있어요');
      if (file.size > MAX_BYTES) throw new Error('5MB 이하 이미지만 올릴 수 있어요');

      // 공고마다 다른 파일이라 이름이 겹치면 안 됩니다.
      const name = `${crypto.randomUUID()}.${extensionFor(file.type)}`;
      const path = `${user.id}/${name}`;

      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
        contentType: file.type,
        cacheControl: '3600',
      });
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from(BUCKET).getPublicUrl(path);

      return publicUrl;
    },

    onError: (error) => {
      console.error('[job-image] 업로드 실패:', error);
    },
  });

  const upload = useCallback((file: File) => mutation.mutateAsync(file), [mutation]);

  return { upload, isUploading: mutation.isPending, uploadError: mutation.error };
}
