/**
 * OWNER: 개발자 B (deck-interaction) — 단독 소유
 *
 * ALBASWIPE_SPEC.md <home_deck_view><card_stack> + <swipe_gesture>
 *
 * 카드 한 장. 구조가 세 겹인 이유 (각 겹이 transform을 하나씩만 소유한다):
 *   [1] 바깥 — `layoutId`. motion의 layout projection이 transform을 통째로 소유한다
 *   [2] 가운데 — 스택 위치(scale / translateY). 원점은 기본값(중앙)
 *   [3] 안쪽 — 드래그(x / rotate / opacity). 원점 50% 120%
 *
 * [2]와 [3]을 합치면 회전 원점이 scale에도 걸려 뒤 카드가 아래로 밀린다.
 * [1]과 [2]를 합치면 상세 카드가 닫힐 때(= 이 카드로 되돌아오는 layout 애니메이션)
 * projection이 scale/translateY를 덮어써 카드가 튄다.
 */
import { useEffect, useRef } from 'react';
import clsx from 'clsx';
import { MapPin, Star } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { Chip } from '@/components/ui';
import type { Job, SwipeDirection } from '@/types';
import { FLIP_TRANSITION, INSTANT_TRANSITION } from '@/features/wishlist/flipMotion';
import { getCategoryVisual } from './categoryVisual';
import { SwipeOverlay } from './SwipeOverlay';
import {
  DEPTH_SCALE,
  DEPTH_Y,
  PROMOTE_DELAY_MS,
  PROMOTE_MS,
  ROTATE_ORIGIN,
  TAP_MAX_DISTANCE_PX,
  TAP_MAX_MS,
  useSwipeGesture,
} from './useSwipeGesture';

type TapTrace = {
  pointerId: number;
  lastX: number;
  lastY: number;
  distance: number;
  startedAt: number;
};

/** 이미지 하단 그라디언트 — SPEC `linear-gradient(to top, rgba(17,24,39,0.75), transparent)`.
 *  hex/rgba 리터럴 대신 --color-ink 토큰을 75%로 섞어 같은 값을 만든다. */
const IMAGE_SCRIM = 'linear-gradient(to top, var(--color-image-scrim), transparent)';

/** 카드 하단에 노출하는 복리후생 칩 개수. 넘치는 만큼은 "+N" 한 칸으로 접는다. */
const MAX_BENEFIT_CHIPS = 3;

/**
 * 주소에서 지역(구/군)만 뽑는다. 시드 주소는 "서울 성북구 안암로 145"로 포맷이 통일돼 있다.
 * 형식이 다르면(토큰 2개 미만) 주소 전체를 그대로 쓴다 — 빈 칸을 만드는 것보다 낫다.
 */
function districtOf(address: string): string {
  const parts = address.trim().split(/\s+/);
  return parts.length >= 2 ? parts[1] : address;
}

export type SwipeCardProps = {
  job: Job;
  /** 0 = 인터랙티브(맨 위), 1·2 = 뒤 카드, 음수 = 날아가는 중 */
  depth: number;
  /** null이 아니면 즉시 날아가기 애니메이션을 시작한다 */
  exitDirection?: SwipeDirection | null;
  /** 드래그로 스와이프가 확정됐을 때. CardStack의 commitSwipe로 합류한다 */
  onCommit?: (direction: SwipeDirection) => void;
  /** 탭(8px 미만 · 500ms 미만)으로 판정됐을 때 — 상세 보기 */
  onTap?: () => void;
  /**
   * 상세 카드와 공유할 motion layoutId. 맨 위 카드에만 준다.
   * CRITICAL: 같은 id를 가진 요소가 동시에 둘 살아 있으면 motion이 주체를 정하지 못한다.
   *           상세가 열리는 동안 CardStack이 이 카드를 빈 자리로 교체한다.
   */
  layoutId?: string;
  zIndex?: number;
};

export function SwipeCard({
  job,
  depth,
  exitDirection = null,
  onCommit,
  onTap,
  layoutId,
  zIndex,
}: SwipeCardProps) {
  const isTop = depth === 0;
  const isExiting = depth < 0;
  const prefersReduced = useReducedMotion();
  const tapTraceRef = useRef<TapTrace | null>(null);

  const { x, opacity, rotate, likeOpacity, nopeOpacity, bind, flyOut } = useSwipeGesture({
    enabled: isTop,
    onCommit: (direction) => onCommit?.(direction),
  });

  /*
   * 상세 열기는 pointer capture 단계에서 판정한다. use-gesture는 swipe 이동과 속도를
   * 계속 담당하지만, 일부 모바일 조합에서 state.tap이 전달되지 않아 카드 탭이 조용히
   * 사라지는 경우까지 이 경로가 막아 준다. 현재 위치가 아니라 이동한 각 구간의 길이를
   * 누적하므로 20px 갔다 제자리로 돌아온 동작도 탭으로 오인하지 않는다.
   */
  const handlePointerDownCapture = (event: React.PointerEvent) => {
    if (!isTop || !event.isPrimary) return;
    tapTraceRef.current = {
      pointerId: event.pointerId,
      lastX: event.clientX,
      lastY: event.clientY,
      distance: 0,
      startedAt: performance.now(),
    };
  };

  const handlePointerMoveCapture = (event: React.PointerEvent) => {
    const trace = tapTraceRef.current;
    if (!trace || trace.pointerId !== event.pointerId) return;
    trace.distance += Math.hypot(event.clientX - trace.lastX, event.clientY - trace.lastY);
    trace.lastX = event.clientX;
    trace.lastY = event.clientY;
  };

  const handlePointerUpCapture = (event: React.PointerEvent) => {
    const trace = tapTraceRef.current;
    tapTraceRef.current = null;
    if (!trace || trace.pointerId !== event.pointerId) return;
    const elapsed = performance.now() - trace.startedAt;
    if (trace.distance <= TAP_MAX_DISTANCE_PX && elapsed < TAP_MAX_MS) onTap?.();
  };

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

  // 리뷰가 없는 가게에 "0.0 (0)"을 띄우면 평가가 나쁜 가게로 읽힌다. 줄째로 감춘다.
  const hasRating = job.rating > 0 && job.reviewCount > 0;
  const district = districtOf(job.address);
  const benefits = job.benefits.slice(0, MAX_BENEFIT_CHIPS);
  const hiddenBenefitCount = job.benefits.length - benefits.length;

  return (
    /* [1] layoutId 전용 겹 — 자체 transform을 갖지 않는다.
           상세 카드가 닫힐 때 motion이 이 요소를 확대 박스에서 제자리로 되돌린다. */
    <motion.div
      layoutId={layoutId}
      transition={prefersReduced ? INSTANT_TRANSITION : FLIP_TRANSITION}
      className="absolute inset-0"
      style={{ zIndex }}
    >
      {/* [2] 스택 위치 */}
      <motion.div
        className="h-full w-full"
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
        {/* [3] 드래그 */}
        <motion.div
          {...dragProps}
          onPointerDownCapture={handlePointerDownCapture}
          onPointerMoveCapture={handlePointerMoveCapture}
          onPointerUpCapture={handlePointerUpCapture}
          onPointerCancelCapture={() => {
            tapTraceRef.current = null;
          }}
          role="article"
          aria-label={
            hasRating
              ? `${job.storeName}, ${job.category}, 시급 ${wage}, 평점 ${job.rating.toFixed(1)}점, 리뷰 ${job.reviewCount}개`
              : `${job.storeName}, ${job.category}, 시급 ${wage}`
          }
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
                <visual.Icon
                  size={48}
                  strokeWidth={1.5}
                  className="text-on-image-faint"
                  aria-hidden
                />
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

          {/*
            흰 영역 40%. 카드 높이가 aspect-[3/4]로 고정이라 이 안은 절대 늘어날 수 없다.
            그래서 요약만 flex-1 + min-h-0으로 두고(= 남는 높이를 흡수하고, 좁으면 자기가 줄어든다)
            나머지 줄은 shrink-0으로 고정한다. 좁은 화면에서도 복리후생 칩이 잘리지 않는다.
          */}
          <div className="flex h-[40%] min-h-0 flex-col gap-1 overflow-hidden px-4 py-3">
            {/* 1행 — 시급 + 별점 */}
            <div className="flex shrink-0 items-baseline gap-2">
              <span className="text-[13px] text-muted">시급</span>
              <span className="tabular text-[18px] leading-none font-semibold text-ink">
                {wage}
              </span>
              {hasRating && (
                <span
                  className="ml-auto flex items-center gap-1"
                  aria-label={`평점 ${job.rating.toFixed(1)}점, 리뷰 ${job.reviewCount}개`}
                >
                  <Star size={14} strokeWidth={0} fill="currentColor" className="text-star" aria-hidden />
                  <span className="tabular text-[14px] leading-none font-semibold text-ink" aria-hidden>
                    {job.rating.toFixed(1)}
                  </span>
                  <span className="tabular text-[12px] leading-none text-faint" aria-hidden>
                    ({job.reviewCount})
                  </span>
                </span>
              )}
            </div>

            {/* 2행 — 근무 요일·시간 */}
            <p className="clamp-1 shrink-0 text-[14px] leading-[1.35] text-body">
              {job.workDays} {job.workHours}
            </p>

            {/* 3행 — 지역 */}
            <p className="clamp-1 flex shrink-0 items-center gap-1 text-[12px] leading-[1.35] text-faint">
              <MapPin size={12} strokeWidth={2} className="shrink-0" aria-hidden />
              {district}
            </p>

            {/* 4행 — 한 줄 요약 (남는 높이를 흡수하는 유일한 줄) */}
            <p className="clamp-2 min-h-0 flex-1 text-[14px] leading-[1.35] text-body">
              {job.summary}
            </p>

            {/* 5행 — 복리후생 */}
            {benefits.length > 0 && (
              <div className="flex shrink-0 items-center gap-1 overflow-hidden">
                {benefits.map((benefit) => (
                  <Chip key={benefit} variant="neutral" size="sm">
                    {benefit}
                  </Chip>
                ))}
                {hiddenBenefitCount > 0 && (
                  <Chip variant="neutral" size="sm">
                    +{hiddenBenefitCount}
                  </Chip>
                )}
              </div>
            )}
          </div>

          {/* 날아가는 동안에도 스탬프를 유지한다 (x가 커져 opacity는 1로 고정된다) */}
          {depth <= 0 && <SwipeOverlay likeOpacity={likeOpacity} nopeOpacity={nopeOpacity} />}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
