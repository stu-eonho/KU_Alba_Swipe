/**
 * OWNER: 개발자 B (deck-interaction) — 단독 소유
 *
 * 구직자 덱의 `SwipeOverlay`와 같은 규격(보더 4px · rounded-field · -12deg/+12deg ·
 * opacity = clamp(abs(x)/100, 0, 1))이지만 **문구와 색만 다르다.**
 *   오른쪽 = "관심!"  → like(브랜드 레드). 알림이 나가는 CTA이므로 레드가 맞다
 *   왼쪽   = "관심 없음" → nope(중립 스틸블루). 공격적인 말이 아니므로 경고색을 쓰지 않는다
 *
 * CRITICAL: opacity에 transition을 걸지 않는다. 드래그 거리에 직결되어야 한다.
 */
import { motion, type MotionValue } from 'motion/react';

export type ApplicantSwipeOverlayProps = {
  /** 오른쪽(관심 있어요) 스탬프 opacity */
  likeOpacity: MotionValue<number>;
  /** 왼쪽(관심 없음) 스탬프 opacity */
  nopeOpacity: MotionValue<number>;
};

const STAMP_BASE =
  'absolute rounded-field border-4 px-3 py-1.5 text-[18px] leading-none font-semibold';

export function ApplicantSwipeOverlay({ likeOpacity, nopeOpacity }: ApplicantSwipeOverlayProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10" aria-hidden>
      <motion.div
        className={`${STAMP_BASE} border-like text-like top-5 right-5`}
        style={{ opacity: likeOpacity, rotate: -12 }}
      >
        관심!
      </motion.div>
      <motion.div
        className={`${STAMP_BASE} border-nope text-nope top-5 left-5`}
        style={{ opacity: nopeOpacity, rotate: 12 }}
      >
        관심 없음
      </motion.div>
    </div>
  );
}
