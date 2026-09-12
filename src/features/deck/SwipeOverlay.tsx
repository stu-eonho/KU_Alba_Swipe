/**
 * OWNER: 개발자 B (deck-interaction) — 단독 소유
 *
 * ALBASWIPE_SPEC.md <swipe_gesture>:
 *   x > 0 → 우상단 "찜!"      보더 4px like, 텍스트 like 28px/800, -12deg
 *   x < 0 → 좌상단 "관심없음"  보더 4px nope, 텍스트 nope 28px/800, +12deg
 *   opacity = clamp(abs(x) / 100, 0, 1)
 *
 * CRITICAL: opacity에 transition을 걸지 않는다. 드래그 거리에 직결되어야
 *           손가락을 따라 즉시 나타난다. 지연되면 반응이 둔해 보인다.
 */
import { motion, type MotionValue } from 'motion/react';

export type SwipeOverlayProps = {
  /** 오른쪽(찜) 스탬프 opacity */
  likeOpacity: MotionValue<number>;
  /** 왼쪽(관심없음) 스탬프 opacity */
  nopeOpacity: MotionValue<number>;
};

const STAMP_BASE =
  'absolute rounded-field border-4 px-3 py-1.5 text-[18px] leading-none font-semibold';

export function SwipeOverlay({ likeOpacity, nopeOpacity }: SwipeOverlayProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10" aria-hidden>
      <motion.div
        className={`${STAMP_BASE} top-5 right-5 border-like text-like`}
        style={{ opacity: likeOpacity, rotate: -12 }}
      >
        찜!
      </motion.div>
      <motion.div
        className={`${STAMP_BASE} top-5 left-5 border-nope text-nope`}
        style={{ opacity: nopeOpacity, rotate: 12 }}
      >
        관심없음
      </motion.div>
    </div>
  );
}
