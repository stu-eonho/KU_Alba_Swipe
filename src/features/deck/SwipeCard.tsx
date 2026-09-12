/**
 * OWNER: 개발자 B (deck-interaction) — 단독 소유
 *
 * ALBASWIPE_SPEC.md <home_deck_view><card_stack> + <swipe_gesture>
 *
 * 카드 한 장. 구조가 두 겹인 이유:
 *   바깥 motion.div — 스택 위치(scale / translateY). 원점은 기본값(중앙)
 *   안쪽 motion.div — 드래그(x / rotate / opacity). 원점 50% 120%
 * 한 요소에 둘을 합치면 회전 원점이 scale에도 걸려 뒤 카드가 아래로 밀린다.
 */
import { useEffect } from 'react';
import clsx from 'clsx';
import { motion, useReducedMotion } from 'motion/react';
import { Chip } from '@/components/ui';
import type { Job, SwipeDirection } from '@/types';
import { getCategoryVisual } from './categoryVisual';
import { SwipeOverlay } from './SwipeOverlay';
import {
  DEPTH_SCALE,
  DEPTH_Y,
  PROMOTE_DELAY_MS,
  PROMOTE_MS,
  ROTATE_ORIGIN,
  useSwipeGesture,
} from './useSwipeGesture';

/** 이미지 하단 그라디언트 — SPEC `linear-gradient(to top, rgba(17,24,39,0.75), transparent)`.
 *  hex/rgba 리터럴 대신 --color-ink 토큰을 75%로 섞어 같은 값을 만든다. */
const IMAGE_SCRIM = 'linear-gradient(to top, var(--color-image-scrim), transparent)';

export type SwipeCardProps = {
  job: Job;
  /** 0 = 인터랙티브(맨 위), 1·2 = 뒤 카드, 음수 = 날아가는 중 */
  depth: number;
  /** null이 아니면 즉시 날아가기 애니메이션을 시작한다 */
  exitDirection?: SwipeDirection | null;
  /** 드래그로 스와이프가 확정됐을 때. CardStack의 commitSwipe로 합류한다 */
  onCommit?: (direction: SwipeDirection) => void;
  zIndex?: number;
};

export function SwipeCard({ job, depth, exitDirection = null, onCommit, zIndex }: SwipeCardProps) {
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

  const visual = getCategoryVisual(job.category);
  const wage = `${job.hourlyWage.toLocaleString('ko-KR')}원`;
  const dragProps = isTop ? bind() : {};

  return (
    <motion.div
      className="absolute inset-0"
      style={{ zIndex }}
      initial={false}
      animate={{ scale, y }}
      transition={{
        // prefers-reduced-motion이면 승격도 즉시 반영한다 (기능은 그대로)
        duration: prefersReduced ? 0 : PROMOTE_MS / 1000,
        ease: 'easeOut',
        // 앞 카드가 날기 시작하고 60ms 뒤에 승격이 시작돼야 튀어나오지 않는다
        delay: prefersReduced || isExiting ? 0 : PROMOTE_DELAY_MS / 1000,
      }}
    >
      <motion.div
        {...dragProps}
        role="article"
        aria-label={`${job.storeName}, ${job.category}, 시급 ${wage}`}
        aria-hidden={!isTop}
        className={clsx(
          'relative h-full w-full overflow-hidden rounded-card bg-surface border border-line-soft select-none',
          !isTop && 'pointer-events-none',
        )}
        style={{
          x,
          rotate,
          opacity,
          transformOrigin: ROTATE_ORIGIN,
          touchAction: 'none',
          willChange: 'transform',
        }}
      >
        {/* 이미지 60% */}
        <div className="relative h-[60%] w-full overflow-hidden">
          {job.imageUrl ? (
            <img
              src={job.imageUrl}
              alt=""
              draggable={false}
              className="h-full w-full object-cover"
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center"
              style={{ backgroundImage: visual.gradient }}
            >
              <visual.Icon size={48} strokeWidth={1.5} className="text-on-image-faint" aria-hidden />
            </div>
          )}

          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[40%]"
            style={{ backgroundImage: IMAGE_SCRIM }}
          />

          <div className="absolute inset-x-0 bottom-0 p-4">
            <Chip variant="onImage" size="sm">
              {job.category}
            </Chip>
            <h2 className="clamp-2 mt-2 text-[18px] leading-tight font-semibold text-white">
              {job.storeName}
            </h2>
          </div>
        </div>

        {/* 흰 영역 40% */}
        <div className="flex h-[40%] flex-col gap-2 p-4">
          <div className="flex items-baseline gap-2">
            <span className="text-[13px] text-muted">시급</span>
            <span className="tabular text-[18px] leading-none font-semibold text-ink">
              {wage}
            </span>
          </div>
          <p className="clamp-2 text-[15px] leading-snug text-body">{job.summary}</p>
          <p className="text-[13px] text-faint">
            {job.workDays} {job.workHours}
          </p>
        </div>

        {/* 날아가는 동안에도 스탬프를 유지한다 (x가 커져 opacity는 1로 고정된다) */}
        {depth <= 0 && <SwipeOverlay likeOpacity={likeOpacity} nopeOpacity={nopeOpacity} />}
      </motion.div>
    </motion.div>
  );
}
