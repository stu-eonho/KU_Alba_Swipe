/**
 * OWNER: 개발자 B (deck-interaction) — 단독 소유
 *
 * ALBASWIPE_SPEC.md <swipe_controls>
 *   카드 아래 24px, 중앙 정렬, gap 24px
 *   관심없음 : 64px 원, 흰 배경 + shadow-control, X 30px nope, aria-label "관심 없음"
 *   찜       : 64px 원, 같은 스타일, Heart(fill) 30px like, aria-label "찜하기"
 *   누름     : scale 0.88 (100ms) 후 복귀 → 드래그와 동일한 날아가기가 재생된다
 *
 * IconButton(variant="surface")의 기본 누름값은 0.97이므로 이 화면에서만 0.88로 덮어쓴다.
 */
import clsx from 'clsx';
import { Heart, X } from 'lucide-react';
import { IconButton } from '@/components/ui';

export type SwipeControlsProps = {
  /** 관심 없음 (왼쪽으로 날림) */
  onNope: () => void;
  /** 찜 (오른쪽으로 날림) */
  onLike: () => void;
  /** 로딩 중이거나 남은 카드가 없으면 true */
  disabled?: boolean;
  className?: string;
};

/** 스펙의 누름 scale 0.88 / 100ms. IconButton 기본 0.97을 덮어쓴다. */
const PRESS = 'active:scale-[0.88]!';

export function SwipeControls({ onNope, onLike, disabled = false, className }: SwipeControlsProps) {
  return (
    <div className={clsx('mt-6 flex items-center justify-center gap-6', className)}>
      <IconButton
        label="관심 없음"
        size={64}
        variant="surface"
        onClick={onNope}
        disabled={disabled}
        className={PRESS}
      >
        <X size={30} strokeWidth={2.5} className="text-nope" aria-hidden />
      </IconButton>

      <IconButton
        label="찜하기"
        size={64}
        variant="surface"
        onClick={onLike}
        disabled={disabled}
        className={PRESS}
      >
        <Heart size={30} strokeWidth={2} className="fill-like text-like" aria-hidden />
      </IconButton>
    </div>
  );
}
