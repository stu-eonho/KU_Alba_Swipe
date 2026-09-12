import { useEffect } from 'react';
import { Bell, WifiOff } from 'lucide-react';
import { Button, EmptyState, Skeleton, useToast } from '@/components/ui';
import { NotificationList } from '@/features/notifications';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/lib/auth-context';

export default function NotificationsPage() {
  const toast = useToast();
  const { user } = useAuth();
  const { notifications, isLoading, isError, retry, markAllRead, markError } = useNotifications();
  const unreadCount = notifications.filter((item) => !item.readAt).length;

  useEffect(() => {
    if (markError) toast.error('읽음 처리하지 못했어요');
  }, [markError, toast]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 p-4" role="status" aria-label="알림을 불러오는 중">
        <Skeleton className="h-[72px]" />
        <Skeleton className="h-[72px]" />
        <Skeleton className="h-[72px]" />
        <Skeleton className="h-[72px]" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="px-4 pt-16">
        <EmptyState
          icon={<WifiOff size={48} className="text-faint" aria-hidden />}
          title="알림을 불러오지 못했어요"
          actionLabel="다시 시도"
          actionVariant="secondary"
          onAction={() => void retry()}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex min-h-12 items-center justify-end px-4">
        <Button variant="ghost" disabled={unreadCount === 0} onClick={() => markAllRead()}>
          모두 읽음
        </Button>
      </div>
      {notifications.length === 0 ? (
        <div className="px-4 pt-12">
          <EmptyState
            icon={<Bell size={48} className="text-faint" aria-hidden />}
            title="새 알림이 없어요"
          />
        </div>
      ) : (
        <NotificationList notifications={notifications} role={user?.role ?? 'seeker'} />
      )}
    </div>
  );
}
