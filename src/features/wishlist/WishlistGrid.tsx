/**
 * OWNER: 개발자 B (screen-composer)
 *
 * ALBASWIPE_SPEC.md <wishlist_view><grid>
 *  2열 격자, padding 16px(p-4), gap 12px(gap-3). 셀은 GridCard가 aspect 3/4로 높이를 고정한다.
 *  → 480px 폭 기준 셀 약 214x285px, 한 화면에 정확히 4개(2x2).
 *  4개를 넘으면 세로 스크롤. 페이지네이션 없음.
 *
 * CRITICAL: 확대 중인 셀은 GridCard를 렌더하지 않고 같은 크기의 빈 자리로 바꾼다.
 * motion의 공유 레이아웃(layoutId)은 같은 id를 가진 요소가 **동시에 둘 이상 살아 있으면**
 * 어느 쪽을 주체로 삼을지 정해지지 않는다. 격자 셀이 주체가 되면 <ul> 안에서 커지면서
 * 형제 카드들을 뚫고 나온다(확대 중 카드가 겹쳐 보이는 원인).
 * opacity-0으로 숨기는 것만으로는 요소가 살아 있어 해결되지 않는다.
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
  /** 확대 중인 공고 id. 해당 셀은 빈 자리로 대체되어 layoutId 주체가 확대 카드 하나로 고정된다 */
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
          {expandedJobId === entry.job.id ? (
            // 확대 중 — 자리만 차지하는 빈 셀. GridCard를 언마운트해야 layoutId가 하나만 남는다.
            <div className="aspect-[3/4] w-full" aria-hidden />
          ) : (
            <GridCard job={entry.job} onClick={onCardClick} onUnwishlist={onUnwishlist} />
          )}
        </li>
      ))}
    </ul>
  );
}
