/**
 * OWNER: 개발자 B (deck-interaction) — 단독 소유
 *
 * ALBASWIPE_SPEC.md <swipe_gesture> + <animations><swipe>
 *
 * 스펙 수치는 전부 이 파일 상단의 상수로 모아 두었다. QA는 여기만 보면 된다.
 * 카드 한 장의 드래그 상태(x / 회전 / 스탬프 opacity)를 소유하고,
 * 확정되면 상위(CardStack)의 commitSwipe로 넘긴다.
 *
 * CRITICAL: x를 useState로 관리하지 않는다. 매 프레임 리렌더가 일어나 끊긴다.
 *           useMotionValue + useTransform으로 리렌더 없이 구동한다.
 */
import { useCallback, useEffect, useRef } from 'react';
import {
  animate,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from 'motion/react';
import { useDrag } from '@use-gesture/react';
import type { SwipeDirection } from '@/types';

/* ------------------------------------------------------------------ */
/* 스펙 확정값 — 임의로 바꾸지 말 것                                    */
/* ------------------------------------------------------------------ */

/** 확정 임계 거리(px). `abs(x) > 100` */
export const SWIPE_THRESHOLD_PX = 100;
/** 확정 임계 속도. `abs(velocityX) > 0.5` — 거리와 OR 조건이다 */
export const SWIPE_VELOCITY = 0.5;
/** 회전 = clamp(x / 18, ±18deg) */
export const ROTATE_DIVISOR = 18;
export const ROTATE_MAX_DEG = 18;
/** 회전 원점. 아래쪽에 축이 있어야 실물 카드처럼 보인다 */
export const ROTATE_ORIGIN = '50% 120%';
/** 날아가기 320ms */
export const FLY_MS = 320;
/** 날아가기 easing cubic-bezier(0.22, 1, 0.36, 1) */
export const FLY_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
/** 목표 x = sign(x) * (윈도우 폭 + 200) */
export const FLY_OVERSHOOT_PX = 200;
/** 취소 복귀 spring(stiffness 300, damping 28) */
export const RETURN_SPRING = { type: 'spring', stiffness: 300, damping: 28 } as const;
/** 다음 카드 승격 260ms ease-out */
export const PROMOTE_MS = 260;
/** 앞 카드가 날기 시작하고 60ms 뒤에 승격을 시작한다 */
export const PROMOTE_DELAY_MS = 60;
/** prefers-reduced-motion: 날아가기 대신 150ms 페이드아웃 */
export const REDUCED_FADE_MS = 150;
/** 햅틱 navigator.vibrate(15) */
export const HAPTIC_MS = 15;
/** DOM에 유지하는 카드 수 */
export const STACK_DEPTH = 3;
/** 깊이별 scale — [0] 1 / [1] 0.95 / [2] 0.90 */
export const DEPTH_SCALE = [1, 0.95, 0.9];
/** 깊이별 translateY(px) — [0] 0 / [1] 12 / [2] 24 */
export const DEPTH_Y = [0, 12, 24];

/* ---- 탭(상세 보기) 판정 ----
 * SwipeCard의 pointer capture fallback과 use-gesture 설정이 함께 쓰는 확정값이다. */

/** 누적 이동 거리가 이 값 이하여야 탭 (use-gesture `tapsThreshold`로 전달) */
export const TAP_MAX_DISTANCE_PX = 8;
/** 누른 시간이 이 값 미만이어야 탭. 길게 누르고 떼는 것은 탭이 아니다 */
/**
 * 500ms 인 이유: 300ms 는 느긋한 탭을 놓친다. 놓치면 거리 8px 도 못 넘어
 * 스와이프도 아니게 되어 **아무 일도 일어나지 않는다** — 데모에서 "탭이 안 먹네"가
 * 되는 최악의 경우다. 거리 조건(8px)이 이미 스와이프와 배타적으로 갈라주므로
 * 시간을 늘려도 스와이프를 잡아먹지 않는다.
 */
export const TAP_MAX_MS = 500;

/* ------------------------------------------------------------------ */

/** 지원 기기에서만 짧게 진동한다. */
export function swipeHaptic() {
  if (typeof navigator === 'undefined') return;
  if (typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(HAPTIC_MS);
  } catch {
    /* 일부 브라우저는 사용자 제스처 밖에서 throw 한다 — 무시한다 */
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export type UseSwipeGestureOptions = {
  /** 맨 위 카드일 때만 true. false면 드래그를 받지 않는다 */
  enabled: boolean;
  /** 드래그로 스와이프가 확정됐을 때. 버튼·키보드와 동일한 경로로 합류한다 */
  onCommit: (direction: SwipeDirection) => void;
};

export type SwipeGesture = {
  x: MotionValue<number>;
  opacity: MotionValue<number>;
  rotate: MotionValue<number>;
  likeOpacity: MotionValue<number>;
  nopeOpacity: MotionValue<number>;
  bind: ReturnType<typeof useDrag>;
  /** 날아가기 애니메이션을 시작한다. 드래그·버튼·키보드가 모두 여기로 모인다 */
  flyOut: (direction: SwipeDirection) => void;
};

export function useSwipeGesture({ enabled, onCommit }: UseSwipeGestureOptions): SwipeGesture {
  const x = useMotionValue(0);
  const opacity = useMotionValue(1);
  const prefersReduced = useReducedMotion();

  /** 한 번 확정된 카드는 더 이상 드래그를 받지 않는다 */
  const committedRef = useRef(false);
  const onCommitRef = useRef(onCommit);
  useEffect(() => {
    onCommitRef.current = onCommit;
  }, [onCommit]);

  // 드래그 추종: 애니메이션 없이 즉시. transition을 걸면 반응이 둔해 보인다.
  const rotate = useTransform(x, (v) => clamp(v / ROTATE_DIVISOR, -ROTATE_MAX_DEG, ROTATE_MAX_DEG));
  // 스탬프 opacity = clamp(abs(x) / 100, 0, 1) — 드래그 거리에 직결, 별도 전환 없음
  const likeOpacity = useTransform(x, (v) => clamp(v / SWIPE_THRESHOLD_PX, 0, 1));
  const nopeOpacity = useTransform(x, (v) => clamp(-v / SWIPE_THRESHOLD_PX, 0, 1));

  const bind = useDrag(
    ({ down, movement: [mx], velocity: [vx], direction: [dx], last, tap }) => {
      if (committedRef.current) return;

      if (down) {
        x.set(mx);
        return;
      }
      if (!last) return;

      // 상세 open은 SwipeCard의 pointer capture가 담당한다. 여기서는 tap을 swipe 속도
      // 판정으로 흘려보내지 않는 배타성만 보장한다. 짧은 3px 움직임의 release 속도가
      // 높아도 카드가 동시에 날아가면 안 된다.
      if (tap) {
        x.set(0);
        return;
      }

      // 거리 또는 속도 — 둘 중 하나만 넘어도 날린다 (빠르게 튕기는 제스처를 살린다)
      const decided = Math.abs(mx) > SWIPE_THRESHOLD_PX || Math.abs(vx) > SWIPE_VELOCITY;
      const sign = mx !== 0 ? Math.sign(mx) : dx;

      if (decided && sign !== 0) {
        committedRef.current = true;
        onCommitRef.current(sign > 0 ? 'right' : 'left');
        return;
      }
      animate(x, 0, RETURN_SPRING);
    },
    // filterTaps + tapsThreshold: 8px 안쪽 움직임은 드래그로 치지 않고 state.tap을 세운다.
    // 덕분에 "탭했는데 카드가 살짝 스와이프되는" 현상이 구조적으로 불가능하다.
    { axis: 'x', filterTaps: true, tapsThreshold: TAP_MAX_DISTANCE_PX, enabled },
  );

  const flyOut = useCallback(
    (direction: SwipeDirection) => {
      committedRef.current = true;

      // prefers-reduced-motion: 날아가기 대신 150ms 페이드아웃. 기능은 그대로 동작한다.
      if (prefersReduced) {
        animate(opacity, 0, { duration: REDUCED_FADE_MS / 1000, ease: 'linear' });
        return;
      }

      const viewport = typeof window === 'undefined' ? 480 : window.innerWidth;
      const target = (direction === 'right' ? 1 : -1) * (viewport + FLY_OVERSHOOT_PX);
      const options = { duration: FLY_MS / 1000, ease: FLY_EASE };

      animate(x, target, options);
      animate(opacity, 0, options);
    },
    [opacity, prefersReduced, x],
  );

  return { x, opacity, rotate, likeOpacity, nopeOpacity, bind, flyOut };
}
