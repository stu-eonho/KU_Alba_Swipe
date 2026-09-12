/**
 * OWNER: 개발자 B (screen-composer)
 *
 * ALBASWIPE_SPEC.md <wishlist_view><grid>
 *  2열 격자, padding 16px(p-4), gap 12px(gap-3). 셀은 GridCard가 aspect 3/4로 높이를 고정한다.
 *  → 480px 폭 기준 셀 약 214x285px, 한 화면에 정확히 4개(2x2).
 *  4개를 넘으면 세로 스크롤. 페이지네이션 없음.
 */
import clsx from 'clsx';
import type { Job, WishlistEntry } from '@/types';
import { GridCard } from './GridCard';

export type WishlistGridProps = {
  entries: WishlistEntry[];
  /** 셀 탭 — 확대·뒤집기는 deck-interaction이 붙인다 */
  onCardClick?: (job: Job) => void;
  /** 셀 우상단 X — 낙관적 찜 해제 */
  onUnwishlist?: (job: Job) => void;
  /** 확대 중인 공고 id. 해당 셀만 숨겨 공유 레이아웃 전환이 깔끔해진다 */
  expandedJobId?: string | null;
  className?: string;
};

export function WishlistGrid({
  entries,
  onCardClick,
  onUnwishlist,
  expandedJobId = null,
  className,
}: WishlistGridProps) {
  return (
    <ul className={clsx('grid grid-cols-2 gap-3 p-4', className)}>
      {entries.map((entry) => (
        <li key={entry.job.id}>
          <GridCard
            job={entry.job}
            onClick={onCardClick}
            onUnwishlist={onUnwishlist}
            isExpanded={expandedJobId === entry.job.id}
          />
        </li>
      ))}
    </ul>
  );
}
