import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui';
import { ProfileAvatar } from '@/features/profile';
import type { ApplicantEntry } from '@/types';
import {
  APPLICATION_STATUS_LABEL,
  employerApplicationBadgeVariant,
  employerApplicationBarClass,
  formatApplicationDate,
} from './applicationPresentation';

export function ApplicantCard({
  entry,
  onOpen,
  onViewed,
}: {
  entry: ApplicantEntry;
  onOpen: (entry: ApplicantEntry) => void;
  onViewed: (applicationId: string) => void;
}) {
  const handleOpen = () => {
    onOpen(entry);
    if (entry.status === 'applied') onViewed(entry.id);
  };

  return (
    <button
      type="button"
      onClick={handleOpen}
      className="border-line-soft relative flex min-h-[84px] w-full items-center gap-3 rounded-tile border bg-surface py-3 pr-3 pl-5 text-left active:bg-subtle"
    >
      <span
        className={`absolute top-3 bottom-3 left-2 w-[3px] rounded-full ${employerApplicationBarClass(entry.status)}`}
        aria-hidden
      />
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
      <Badge variant={employerApplicationBadgeVariant(entry.status)}>
        {APPLICATION_STATUS_LABEL[entry.status]}
      </Badge>
      <ChevronRight size={18} strokeWidth={1.75} className="shrink-0 text-faint" aria-hidden />
    </button>
  );
}
