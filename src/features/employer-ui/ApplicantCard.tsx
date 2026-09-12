import { useEffect, useRef } from 'react';
import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui';
import { ProfileAvatar } from '@/features/profile';
import type { ApplicantEntry } from '@/types';
import { APPLICATION_STATUS_LABEL, formatApplicationDate } from './applicationPresentation';

const VIEW_DELAY_MS = 1000;

export function ApplicantCard({
  entry,
  onOpen,
  onViewed,
}: {
  entry: ApplicantEntry;
  onOpen: (entry: ApplicantEntry) => void;
  onViewed: (applicationId: string) => void;
}) {
  const rowRef = useRef<HTMLButtonElement>(null);
  const viewedRef = useRef(entry.status !== 'applied');

  useEffect(() => {
    if (entry.status !== 'applied' || viewedRef.current) return;
    const row = rowRef.current;
    if (!row || typeof IntersectionObserver === 'undefined') return;

    let timer: number | undefined;
    const observer = new IntersectionObserver(
      ([result]) => {
        window.clearTimeout(timer);
        if (!result?.isIntersecting) return;
        timer = window.setTimeout(() => {
          if (viewedRef.current) return;
          viewedRef.current = true;
          onViewed(entry.id);
        }, VIEW_DELAY_MS);
      },
      { threshold: 0.6 },
    );
    observer.observe(row);

    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [entry.id, entry.status, onViewed]);

  return (
    <button
      ref={rowRef}
      type="button"
      onClick={() => onOpen(entry)}
      className="border-line-soft flex min-h-[76px] w-full items-center gap-3 border-b px-4 py-3 text-left active:bg-subtle"
    >
      <ProfileAvatar
        nickname={entry.seeker.nickname}
        avatarUrl={entry.seeker.profile?.avatarUrl}
        size={40}
      />
      <span className="min-w-0 flex-1">
        <span className="clamp-1 block text-[14px] font-semibold text-ink">
          {entry.seeker.nickname}
        </span>
        <span className="clamp-1 mt-1 block text-[12px] text-muted">{entry.job.storeName}</span>
        <span className="mt-1 block text-[11px] text-faint">
          {formatApplicationDate(entry.createdAt)} 지원
        </span>
      </span>
      <Badge>{APPLICATION_STATUS_LABEL[entry.status]}</Badge>
      <ChevronRight size={18} strokeWidth={1.75} className="shrink-0 text-faint" aria-hidden />
    </button>
  );
}
