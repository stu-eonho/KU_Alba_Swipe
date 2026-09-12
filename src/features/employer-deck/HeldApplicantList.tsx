/**
 * OWNER: 개발자 B (deck-interaction) — 단독 소유
 *
 * PHASE4_PLAN.md B-2 · 보류 탭
 * 사용자 요청: "특정 지원자를 관심없다고 해서 바로 없애는 것이 아닌 다른 칸으로"
 *
 * **되돌릴 수 있다는 게 이 화면의 존재 이유다.** 왼쪽으로 넘긴 지원자는 사라진 게
 * 아니라 여기 남아 있고, "다시 보기"로 덱에 되돌린다.
 *
 * 카드가 아니라 리스트다 — 한 화면에 최대한 많이 보여야 훑어보기 좋다.
 * 구분은 헤어라인 1px만 쓰고 그림자는 쓰지 않는다.
 *
 * 데이터는 prop으로 받는다. 개발자 A의 훅이 오면 페이지 한 줄만 바뀐다.
 */
import clsx from 'clsx';
import { Archive } from 'lucide-react';
import { Button, EmptyState } from '@/components/ui';
import { ProfileAvatar } from '@/features/profile';
import type { ApplicantEntry } from '@/types';

export type HeldApplicantListProps = {
  /** 보류된 지원자들 */
  entries: ApplicantEntry[];
  /** "다시 보기" — 덱으로 되돌린다 */
  onRestore?: (seekerId: string) => void;
  className?: string;
};

export function HeldApplicantList({ entries, onRestore, className }: HeldApplicantListProps) {
  if (entries.length === 0) {
    return (
      <EmptyState
        icon={<Archive size={56} className="text-faint" aria-hidden />}
        title="보류한 지원자가 없어요"
        description="지원자를 왼쪽으로 넘기면 여기에 남아요. 언제든 다시 볼 수 있어요"
        actionLabel="지원자 보러 가기"
        actionVariant="secondary"
        actionTo="/employer/applicants"
        className={className}
      />
    );
  }

  return (
    <ul aria-label="보류한 지원자" className={clsx('border-line-soft border-t', className)}>
      {entries.map((entry) => (
        <li key={entry.id} className="border-line-soft flex items-center gap-3 border-b px-4 py-3">
          <ProfileAvatar
            nickname={entry.seeker.nickname}
            avatarUrl={entry.seeker.profile?.avatarUrl}
            size={40}
          />
          <div className="min-w-0 flex-1">
            <p className="clamp-1 text-ink text-[16px] leading-tight font-semibold">
              {entry.seeker.nickname}
            </p>
            <p className="clamp-1 text-faint mt-1 text-[12px] leading-[1.35]">
              {entry.job.storeName} 지원
            </p>
          </div>
          {/* 레드는 CTA 전용 — 복구는 중립 버튼으로 둔다 */}
          <Button
            variant="ghost"
            size="md"
            onClick={() => onRestore?.(entry.seeker.id)}
            className="border-line bg-surface shrink-0 border px-3"
            aria-label={`${entry.seeker.nickname} 다시 보기`}
          >
            다시 보기
          </Button>
        </li>
      ))}
    </ul>
  );
}
