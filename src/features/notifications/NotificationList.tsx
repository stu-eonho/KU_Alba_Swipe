import { Bell, BriefcaseBusiness, CheckCircle2, Eye, XCircle } from 'lucide-react';
import type { NotificationItem, NotificationType } from '@/types';

const TYPE_ICON: Record<NotificationType, typeof Bell> = {
  application_received: BriefcaseBusiness,
  application_viewed: Eye,
  application_accepted: CheckCircle2,
  application_rejected: XCircle,
  system: Bell,
};

const relativeTime = new Intl.RelativeTimeFormat('ko-KR', { numeric: 'auto' });

function formatRelative(value: string): string {
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return '시간 정보 없음';
  const diffSeconds = Math.round((time - Date.now()) / 1000);
  if (Math.abs(diffSeconds) < 60) return relativeTime.format(diffSeconds, 'second');
  const diffMinutes = Math.round(diffSeconds / 60);
  if (Math.abs(diffMinutes) < 60) return relativeTime.format(diffMinutes, 'minute');
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return relativeTime.format(diffHours, 'hour');
  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 7) return relativeTime.format(diffDays, 'day');
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' }).format(new Date(time));
}

export function NotificationList({
  notifications,
  onSelect,
}: {
  notifications: NotificationItem[];
  onSelect: (notification: NotificationItem) => void;
}) {
  return (
    <ul className="divide-y divide-line-soft border-y border-line-soft bg-surface">
      {notifications.map((notification) => {
        const Icon = TYPE_ICON[notification.type];
        return (
          <li key={notification.id}>
            <button
              type="button"
              onClick={() => onSelect(notification)}
              className={`flex min-h-[72px] w-full items-start gap-3 px-4 py-3 text-left active:bg-subtle ${
                notification.readAt ? 'bg-surface' : 'bg-brand-soft'
              }`}
            >
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-subtle text-muted">
                <Icon size={19} strokeWidth={1.75} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  {!notification.readAt && (
                    <>
                      <span className="size-1.5 shrink-0 rounded-full bg-ink" aria-hidden />
                      <span className="sr-only">읽지 않음</span>
                    </>
                  )}
                  <span className="clamp-1 text-[14px] font-semibold text-ink">
                    {notification.title}
                  </span>
                </span>
                <span className="clamp-2 mt-1 block text-[13px] leading-[1.45] text-body">
                  {notification.body}
                </span>
                <span className="mt-1 block text-[11px] text-faint">
                  {formatRelative(notification.createdAt)}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
