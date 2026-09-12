/**
 * OWNER: 개발자 A (데이터/인증)
 *
 *   const { templates, isLoading, save, remove, isSaving } = useApplyTemplates();
 *   await save('성실 지원서', textareaValue);
 *
 * B (F5 화면): 지원 화면 Textarea 위에 템플릿 칩 행.
 *   탭하면 **커서 위치에 삽입**하세요. 덮어쓰면 쓰던 글이 날아갑니다.
 *   제목을 비워서 save() 해도 됩니다 — 본문 앞 20자가 제목이 됩니다.
 */
import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createApplyTemplate,
  deleteApplyTemplate,
  fetchApplyTemplates,
  type ApplyTemplate,
} from '@/lib/api/templates';
import { useAuth } from '@/lib/auth-context';

const KEY = ['apply-templates'];

export function useApplyTemplates() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: KEY,
    queryFn: fetchApplyTemplates,
    enabled: Boolean(user),
  });

  const saving = useMutation({
    mutationFn: ({ title, body }: { title: string; body: string }) =>
      createApplyTemplate(title, body),
    onSuccess: (created) => {
      // 서버가 돌려준 행을 앞에 끼웁니다. 저장 직후 재요청이 필요 없습니다.
      queryClient.setQueryData<ApplyTemplate[]>(KEY, (list) => [created, ...(list ?? [])]);
    },
    onError: (error) => {
      console.error('[templates] 저장 실패:', error);
    },
  });

  const removing = useMutation({
    mutationFn: (id: string) => deleteApplyTemplate(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: KEY });
      const previous = queryClient.getQueryData<ApplyTemplate[]>(KEY);
      queryClient.setQueryData<ApplyTemplate[]>(KEY, (list) =>
        (list ?? []).filter((item) => item.id !== id),
      );
      return { previous };
    },
    onError: (error, _id, context) => {
      console.error('[templates] 삭제 실패:', error);
      if (context?.previous) queryClient.setQueryData(KEY, context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: KEY });
    },
  });

  const save = useCallback(
    (title: string, body: string) => saving.mutateAsync({ title, body }),
    [saving],
  );
  const remove = useCallback((id: string) => removing.mutate(id), [removing]);

  return {
    templates: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    save,
    remove,
    isSaving: saving.isPending,
    saveError: saving.error,
  };
}
