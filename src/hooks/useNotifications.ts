/**
 * OWNER: 개발자 A (데이터/인증)
 *
 *   const { notifications, isLoading, isError, retry, markRead, markAllRead } = useNotifications();
 *   const { count } = useUnreadNotificationCount();   // TopBar 배지
 *
 * 실시간 채널은 이번 범위에서 붙이지 않습니다. 30초 폴링 + 창 포커스 재조회로 갑니다 —
 * 알림 하나 때문에 Realtime 연결을 유지하는 건 지금 단계에서 과합니다.
 *
 * 읽음 처리는 목록과 배지를 같은 프레임에 낙관적으로 바꾸고, 실패하면 둘 다 되돌립니다.
 * 한쪽만 바뀌면 "안 읽은 알림 1" 배지 아래에 읽은 알림만 보이는 상태가 됩니다.
 */
import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/api/notifications';
import { useAuth } from '@/lib/auth-context';
import type { NotificationItem } from '@/types';

const LIST_KEY = ['notifications', 'list'];
const COUNT_KEY = ['notifications', 'unread-count'];

const STALE_TIME = 15_000;
const REFETCH_INTERVAL = 30_000;

type Snapshot = {
  list: NotificationItem[] | undefined;
  count: number | undefined;
};

export function useNotifications() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: LIST_KEY,
    queryFn: () => fetchNotifications(),
    enabled: Boolean(user),
    staleTime: STALE_TIME,
    refetchInterval: REFETCH_INTERVAL,
    refetchOnWindowFocus: true,
  });

  /** 목록과 배지를 한 번에 바꿉니다. 되돌릴 수 있도록 직전 값을 함께 돌려줍니다. */
  const applyOptimistic = useCallback(
    async (update: (items: NotificationItem[]) => NotificationItem[]): Promise<Snapshot> => {
      await queryClient.cancelQueries({ queryKey: LIST_KEY });
      await queryClient.cancelQueries({ queryKey: COUNT_KEY });

      const previous: Snapshot = {
        list: queryClient.getQueryData<NotificationItem[]>(LIST_KEY),
        count: queryClient.getQueryData<number>(COUNT_KEY),
      };

      const next = update(previous.list ?? []);
      queryClient.setQueryData<NotificationItem[]>(LIST_KEY, next);
      // 배지는 목록에서 다시 세어 맞춥니다. 따로 빼면 두 값이 어긋납니다.
      queryClient.setQueryData<number>(COUNT_KEY, next.filter((item) => !item.readAt).length);

      return previous;
    },
    [queryClient],
  );

  const rollback = useCallback(
    (previous?: Snapshot) => {
      if (!previous) return;
      queryClient.setQueryData(LIST_KEY, previous.list);
      queryClient.setQueryData(COUNT_KEY, previous.count);
    },
    [queryClient],
  );

  const settle = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  }, [queryClient]);

  const readOne = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onMutate: (id) => {
      const readAt = new Date().toISOString();
      return applyOptimistic((items) =>
        items.map((item) => (item.id === id && !item.readAt ? { ...item, readAt } : item)),
      );
    },
    onError: (error, _id, previous) => {
      console.error('[notifications] 읽음 처리 실패:', error);
      rollback(previous);
    },
    onSettled: settle,
  });

  const readAll = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onMutate: () => {
      const readAt = new Date().toISOString();
      return applyOptimistic((items) =>
        items.map((item) => (item.readAt ? item : { ...item, readAt })),
      );
    },
    onError: (error, _variables, previous) => {
      console.error('[notifications] 모두 읽음 실패:', error);
      rollback(previous);
    },
    onSettled: settle,
  });

  const markRead = useCallback((id: string) => readOne.mutate(id), [readOne]);
  const markAllRead = useCallback(() => readAll.mutate(), [readAll]);

  return {
    notifications: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    retry: query.refetch,
    markRead,
    markAllRead,
    /** 읽음 처리가 실패했을 때만 채워집니다. "읽음 처리하지 못했어요" 토스트에 쓰세요 */
    markError: readOne.error ?? readAll.error,
  };
}

/**
 * 배지 숫자.
 *
 * 실패하면 isError 로 알립니다 — 배지만 숨기고 앱 탐색은 그대로 두세요.
 * 알림 수를 못 읽었다고 화면을 막을 이유가 없습니다.
 */
export function useUnreadNotificationCount() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: COUNT_KEY,
    queryFn: fetchUnreadNotificationCount,
    enabled: Boolean(user),
    staleTime: STALE_TIME,
    refetchInterval: REFETCH_INTERVAL,
    refetchOnWindowFocus: true,
  });

  return {
    count: query.data ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
