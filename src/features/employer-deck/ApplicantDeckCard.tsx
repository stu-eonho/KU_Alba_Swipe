/**
 * OWNER: 개발자 B (deck-interaction) — 단독 소유
 *
 * PHASE4_PLAN.md B-1 — 지원자 카드 한 장의 제스처 껍데기.
 *
 * 그리기는 전부 `ApplicantSwipeCard`(개발자 B / screen-composer 소유)가 한다.
 * 여기는 구직자 덱의 `SwipeCard`와 **완전히 같은 3겹 구조**만 다시 세운다:
 *   [1] 스택 z-index      [2] 스택 위치(scale / translateY)   [3] 드래그(x / rotate / opacity)
 *
 * CRITICAL: 제스처 로직을 새로 짜지 않는다. `useSwipeGesture`와 스펙 상수를
 *           그대로 import 한다 — 임계값·회전·날아가기가 두 덱에서 달라지면 안 된다.
 *           (layoutId 겹은 없다. 지원자 카드에는 확대 상세가 없다.)
 */
import { useEffect } from 'react';
import clsx from 'clsx';
import { motion, useReducedMotion } from 'motion/react';
import { ApplicantSwipeCard } from '@/features/employer-ui';
import type { ApplicantEntry, SwipeDirection } from '@/types';
import {
  DEPTH_SCALE,
  DEPTH_Y,
  PROMOTE_DELAY_MS,
  PROMOTE_MS,
  ROTATE_ORIGIN,
  useSwipeGesture,
} from '@/features/deck/useSwipeGesture';
import { ApplicantSwipeOverlay } from './ApplicantSwipeOverlay';

export type ApplicantDeckCardProps = {
  entry: ApplicantEntry;
  /** 0 = 인터랙티브(맨 위), 1·2 = 뒤 카드, 음수 = 날아가는 중 */
  depth: number;
  /** null이 아니면 즉시 날아가기 애니메이션을 시작한다 */
  exitDirection?: SwipeDirection | null;
  onCommit?: (direction: SwipeDirection) => void;
  zIndex?: number;
};

export function ApplicantDeckCard({
  entry,
  depth,
  exitDirection = null,
  onCommit,
  zIndex,
}: ApplicantDeckCardProps) {
  const isTop = depth === 0;
  const isExiting = depth < 0;
  const prefersReduced = useReducedMotion();

  const { x, opacity, rotate, likeOpacity, nopeOpacity, bind, flyOut } = useSwipeGesture({
    enabled: isTop,
    onCommit: (direction) => onCommit?.(direction),
  });

  // 드래그·버튼·키보드 세 입력이 전부 이 한 경로로 들어온다.
  useEffect(() => {
    if (exitDirection) flyOut(exitDirection);
  }, [exitDirection, flyOut]);

  const slot = Math.min(Math.max(depth, 0), DEPTH_SCALE.length - 1);
  const scale = isExiting ? 1 : DEPTH_SCALE[slot];
  const y = isExiting ? 0 : DEPTH_Y[slot];
  const dragProps = isTop ? bind() : {};

  return (
    /* [1] z-index 전용 겹 */
    <div className="absolute inset-0" style={{ zIndex }} aria-hidden={!isTop || undefined}>
      {/* [2] 스택 위치 */}
      <motion.div
        className="h-full w-full"
        initial={false}
        animate={{ scale, y }}
        transition={{
          duration: prefersReduced ? 0 : PROMOTE_MS / 1000,
          ease: 'easeOut',
          // 앞 카드가 날기 시작하고 60ms 뒤에 승격이 시작돼야 튀어나오지 않는다
          delay: prefersReduced || isExiting ? 0 : PROMOTE_DELAY_MS / 1000,
        }}
      >
        {/* [3] 드래그 */}
        <motion.div
          {...dragProps}
          className={clsx('relative h-full w-full', !isTop && 'pointer-events-none')}
          style={{
            x,
            rotate,
            opacity,
            transformOrigin: ROTATE_ORIGIN,
            touchAction: 'none',
            willChange: 'transform',
          }}
        >
          <ApplicantSwipeCard entry={entry} />
          {/* 날아가는 동안에도 스탬프를 유지한다 (x가 커져 opacity는 1로 고정된다) */}
          {depth <= 0 && (
            <ApplicantSwipeOverlay likeOpacity={likeOpacity} nopeOpacity={nopeOpacity} />
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
