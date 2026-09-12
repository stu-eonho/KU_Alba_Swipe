import { useState } from 'react';
import { Bell, BriefcaseBusiness, CheckCircle2, Eye, Heart, Sparkles, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '@/hooks/useNotifications';
import type { NotificationItem, NotificationType } from '@/types';
import { MatchSheet } from './MatchSheet';

const TYPE_ICON: Record<NotificationType, typeof Bell> = {
  application_received: BriefcaseBusiness,
  application_viewed: Eye,
  application_accepted: CheckCircle2,
  application_rejected: XCircle,
  // Phase 4 신규 타입. A 가 계약을 넓히면서 build 가 깨지지 않도록 자리만 채웠습니다.
  // 아이콘·색 최종 결정은 B-4 입니다.
  employer_interested: Heart,
  mutual_match: Sparkles,
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

/** payload 는 Record<string, unknown> 이라 꺼낼 때 한 번 좁힌다 */
function counterpartIdOf(notification: NotificationItem): string | null {
  const value = notification.payload?.counterpartId;
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function NotificationList({
  notifications,
  onSelect,
}: {
  notifications: NotificationItem[];
  onSelect: (notification: NotificationItem) => void;
}) {
  const navigate = useNavigate();
  const { markRead } = useNotifications();
  const [matched, setMatched] = useState<NotificationItem | null>(null);

  /**
   * Phase 4 에서 추가된 두 타입은 지원서가 없다 — 호출부(NotificationsPage)의 기본 동작은
   * applicationId 로 상세 화면을 여는 것이라 여기서 먼저 가로챈다. 나머지는 그대로 흘려보낸다.
   */
  const handleTap = (notification: NotificationItem) => {
    if (notification.type === 'mutual_match') {
      if (!notification.readAt) markRead(notification.id);
      setMatched(notification);
      return;
    }
    if (notification.type === 'employer_interested') {
      if (!notification.readAt) markRead(notification.id);
      navigate('/settings/applications');
      return;
    }
    onSelect(notification);
  };

  return (
    <>
      <ul className="divide-y divide-line-soft border-y border-line-soft bg-surface">
        {notifications.map((notification) => {
          const Icon = TYPE_ICON[notification.type];
          return (
            <li key={notification.id}>
              <button
                type="button"
                onClick={() => handleTap(notification)}
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
      <MatchSheet
        open={matched !== null}
        counterpartId={matched ? counterpartIdOf(matched) : null}
        storeName={matched?.job?.storeName}
        onClose={() => setMatched(null)}
      />
    </>
  );
}
