/**
 * OWNER: 개발자 B (deck-interaction) — 단독 소유
 *
 * PHASE4_PLAN.md B-1 — "컨트롤 버튼 2개 라벨: 관심 없음 / 관심 있어요"
 *
 * 구직자 덱의 `SwipeControls`(원형 아이콘 2개)와 달리 여기는 **글자 라벨**이다.
 * 구인자가 처음 보는 화면이라 아이콘만으로는 "왼쪽이 거절인가?"가 모호하다.
 * 왼쪽은 되돌릴 수 없으므로 문구를 분명히 한다.
 *
 * 레드는 CTA 전용 — 브랜드 레드는 "관심 있어요"에만 쓴다.
 * "관심 없음"은 중립(surface + 헤어라인 + text-muted)이다.
 */
import clsx from 'clsx';
import { Button } from '@/components/ui';

export type ApplicantSwipeControlsProps = {
  /** 관심 없음 (왼쪽으로 날림) — offers 에 기록이 남아 다시 뜨지 않는다 */
  onHold: () => void;
  /** 관심 있어요 (오른쪽으로 날림) — 지원자에게 알림이 간다 */
  onInterested: () => void;
  disabled?: boolean;
  className?: string;
};

export function ApplicantSwipeControls({
  onHold,
  onInterested,
  disabled = false,
  className,
}: ApplicantSwipeControlsProps) {
  return (
    <div className={clsx('mt-6 flex w-full items-center justify-center gap-3 px-4', className)}>
      <Button
        variant="ghost"
        size="md"
        onClick={onHold}
        disabled={disabled}
        className="border-line bg-surface w-full max-w-[160px] border"
      >
        관심 없음
      </Button>
      <Button
        variant="primary"
        size="md"
        onClick={onInterested}
        disabled={disabled}
        className="w-full max-w-[180px]"
      >
        관심 있어요
      </Button>
    </div>
  );
}
