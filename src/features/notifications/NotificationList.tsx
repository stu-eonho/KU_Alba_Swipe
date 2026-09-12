import { useState } from 'react';
import clsx from 'clsx';
import { Bell, BriefcaseBusiness, Eye, Heart, Sparkles, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui';
import { useNotifications } from '@/hooks/useNotifications';
import type { NotificationItem, NotificationType } from '@/types';
import { MatchSheet } from './MatchSheet';

const TYPE_ICON: Record<NotificationType, typeof Bell> = {
  application_received: BriefcaseBusiness,
  application_viewed: Eye,
  application_accepted: Heart,
  application_rejected: XCircle,
  // Phase 4 신규 타입. A 가 계약을 넓히면서 build 가 깨지지 않도록 자리만 채웠습니다.
  // 아이콘·색 최종 결정은 B-4 입니다.
  employer_interested: Heart,
  mutual_match: Sparkles,
  system: Bell,
};

type NotificationTone = 'info' | 'neutral' | 'brand' | 'success' | 'danger';

const TYPE_META: Record<NotificationType, { label: string; tone: NotificationTone }> = {
  application_received: { label: '새 지원', tone: 'info' },
  application_viewed: { label: '지원서 읽음', tone: 'neutral' },
  application_accepted: { label: '관심 도착', tone: 'brand' },
  application_rejected: { label: '지원 종료', tone: 'danger' },
  employer_interested: { label: '관심 도착', tone: 'brand' },
  mutual_match: { label: '매칭', tone: 'success' },
  system: { label: '안내', tone: 'neutral' },
};

const TONE_CLASS: Record<NotificationTone, string> = {
  info: 'bg-info-soft text-info',
  neutral: 'bg-subtle text-muted',
  brand: 'bg-brand-soft text-brand',
  success: 'bg-success-soft text-success',
  danger: 'bg-danger-soft text-error',
};

const TONE_TEXT: Record<NotificationTone, string> = {
  info: 'text-info',
  neutral: 'text-muted',
  brand: 'text-brand',
  success: 'text-success',
  danger: 'text-error',
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
  const toast = useToast();
  const { markRead } = useNotifications();
  const [matched, setMatched] = useState<NotificationItem | null>(null);
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set());

  /**
   * Phase 4 에서 추가된 두 타입은 지원서가 없다 — 호출부(NotificationsPage)의 기본 동작은
   * applicationId 로 상세 화면을 여는 것이라 여기서 먼저 가로챈다. 나머지는 그대로 흘려보낸다.
   */
  const handleTap = (notification: NotificationItem) => {
    if (notification.type === 'mutual_match') {
      if (!counterpartIdOf(notification)) {
        toast.error('관련 내용을 찾을 수 없어요');
        return;
      }
      setMatched(notification);
      if (!notification.readAt) markRead(notification.id);
      return;
    }
    if (notification.type === 'employer_interested') {
      navigate('/settings/applications');
      if (!notification.readAt) markRead(notification.id);
      return;
    }
    onSelect(notification);
  };

  return (
    <>
      <ul className="divide-y divide-line-soft border-y border-line-soft bg-surface">
        {notifications.map((notification) => {
          const Icon = TYPE_ICON[notification.type];
          const meta = TYPE_META[notification.type];
          const imageUrl = notification.job?.imageUrl;
          const showImage = Boolean(imageUrl && !failedImages.has(notification.id));
          const displayTitle =
            notification.type === 'application_accepted'
              ? '구인자가 관심을 보냈어요'
              : notification.title.replaceAll('채용 확정', '관심 도착').replaceAll('채용', '관심');
          const displayBody =
            notification.job?.storeName && !notification.body.includes(notification.job.storeName)
            ? `${notification.job.storeName} · ${notification.body}`
            : notification.body;
          return (
            <li key={notification.id}>
              <button
                type="button"
                onClick={() => handleTap(notification)}
                className={`flex min-h-[88px] w-full items-start gap-3 py-3 pr-3 text-left active:bg-subtle ${
                  notification.readAt ? 'bg-surface' : 'bg-brand-soft'
                }`}
              >
                <span
                  className="flex w-5 shrink-0 self-stretch items-start justify-center pt-2"
                  aria-hidden
                >
                  {!notification.readAt && <span className="bg-brand size-2 rounded-full" />}
                </span>
                {!notification.readAt && <span className="sr-only">읽지 않은 알림. </span>}
                <span
                  className={clsx(
                    'relative mt-0.5 flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-tile',
                    !showImage && TONE_CLASS[meta.tone],
                  )}
                >
                  {showImage ? (
                    <>
                      <img
                        src={imageUrl ?? undefined}
                        alt=""
                        className="h-full w-full object-cover"
                        onError={() =>
                          setFailedImages((previous) => new Set(previous).add(notification.id))
                        }
                      />
                      <span
                        className={clsx(
                          'border-surface absolute right-0 bottom-0 flex size-[18px] items-center justify-center rounded-full border',
                          TONE_CLASS[meta.tone],
                        )}
                      >
                        <Icon size={11} strokeWidth={2} aria-hidden />
                      </span>
                    </>
                  ) : (
                    <Icon size={20} strokeWidth={1.75} aria-hidden />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={clsx(
                      'block text-[11px] leading-[1.3] font-semibold',
                      TONE_TEXT[meta.tone],
                    )}
                  >
                    {meta.label}
                  </span>
                  <span className="clamp-1 mt-0.5 block text-[14px] font-semibold text-ink">
                    {displayTitle}
                  </span>
                  <span className="clamp-2 mt-1 block text-[13px] leading-[1.45] text-body">
                    {displayBody}
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
