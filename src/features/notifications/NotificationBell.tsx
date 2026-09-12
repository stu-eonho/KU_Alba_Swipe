import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { IconButton } from '@/components/ui';
import { useUnreadNotificationCount } from '@/hooks/useNotifications';

export function NotificationBell() {
  const navigate = useNavigate();
  const { count, isError } = useUnreadNotificationCount();
  const visibleCount = isError ? 0 : count;
  const badge = visibleCount > 99 ? '99+' : String(visibleCount);

  return (
    <div className="relative">
      <IconButton
        label={visibleCount > 0 ? `읽지 않은 알림 ${visibleCount}개` : '알림'}
        onClick={() => navigate('/notifications')}
      >
        <Bell size={22} strokeWidth={1.75} aria-hidden />
      </IconButton>
      {visibleCount > 0 && (
        <span
          aria-hidden
          className="pointer-events-none absolute top-0 right-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold leading-none text-white"
        >
          {badge}
        </span>
      )}
    </div>
  );
}
