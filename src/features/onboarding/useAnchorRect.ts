/**
 * OWNER: 개발자 B (screen-composer) — 단독 소유
 *
 * PHASE6_PLAN.md B-3 — `data-tour` 앵커의 화면 좌표를 재는 훅.
 *
 * ⚠️ 가장 위험한 지점: 스와이프 덱은 카드가 계속 교체되어 앵커가 흔들린다.
 *    그래서 단계 정의는 카드 개별이 아니라 **스택 영역 전체**를 가리키고,
 *    여기서는 ResizeObserver + resize/scroll + 짧은 폴링으로 좌표를 계속 갱신한다.
 *
 * CRITICAL: 앵커가 없거나 rect 가 0이면 null 을 돌려준다. 부르는 쪽은 스포트라이트를
 *           건너뛰고 설명 카드만 띄운다. 튜토리얼은 첫 진입 화면이라 절대 깨지면 안 된다.
 */
import { useEffect, useState } from 'react';

export type AnchorRect = { top: number; left: number; width: number; height: number };

/** 폴링 간격. ResizeObserver 가 못 잡는 이동(레이아웃 이동, 주소창 축소)을 메운다. */
const POLL_MS = 350;
/** 이 차이 이하의 변화는 무시한다. 매 폴링마다 새 객체를 만들면 리렌더가 끝없이 돈다. */
const EPSILON = 0.5;

function same(a: AnchorRect | null, b: AnchorRect | null): boolean {
  if (a === null || b === null) return a === b;
  return (
    Math.abs(a.top - b.top) < EPSILON &&
    Math.abs(a.left - b.left) < EPSILON &&
    Math.abs(a.width - b.width) < EPSILON &&
    Math.abs(a.height - b.height) < EPSILON
  );
}

/**
 * @param anchor `data-tour` 값. null 이면 측정하지 않는다.
 * @param enabled 튜토리얼이 떠 있는 동안만 true.
 */
export function useAnchorRect(anchor: string | null, enabled: boolean): AnchorRect | null {
  /**
   * 측정값에 어떤 앵커의 것인지를 함께 담는다. 단계가 바뀌는 순간 이전 앵커의 좌표가
   * 한 프레임 남으면 스포트라이트가 엉뚱한 곳에서 튄다. 렌더에서 걸러 낸다.
   */
  const [measured, setMeasured] = useState<{ anchor: string; rect: AnchorRect | null } | null>(
    null,
  );

  useEffect(() => {
    // 여기서 setState 를 호출하지 않는다(cascading render). 값은 렌더에서 걸러 낸다.
    if (!enabled || !anchor) return;

    let disposed = false;
    let observer: ResizeObserver | null = null;
    let observed: Element | null = null;

    const measure = () => {
      if (disposed) return;
      let next: AnchorRect | null = null;
      let el: Element | null = null;
      try {
        // 속성 값은 단계 정의에 있는 상수뿐이라 주입 위험이 없다
        el = document.querySelector(`[data-tour="${anchor}"]`);
        if (el) {
          const r = el.getBoundingClientRect();
          // 숨겨져 있거나 아직 레이아웃 전이면 0이 나온다 → 스포트라이트를 포기한다
          if (r.width >= 1 && r.height >= 1) {
            next = { top: r.top, left: r.left, width: r.width, height: r.height };
          }
        }
      } catch {
        next = null;
      }

      setMeasured((prev) =>
        prev && prev.anchor === anchor && same(prev.rect, next) ? prev : { anchor, rect: next },
      );

      // 대상이 리마운트되면(덱 로딩 → 카드) 관찰 대상을 갈아 끼운다
      if (observer && el !== observed) {
        if (observed) observer.unobserve(observed);
        observed = el;
        if (el) {
          try {
            observer.observe(el);
          } catch {
            /* 무시 */
          }
        }
      }
    };

    try {
      if (typeof ResizeObserver !== 'undefined') {
        observer = new ResizeObserver(() => measure());
      }
    } catch {
      observer = null;
    }

    measure();
    // 첫 프레임에는 아직 레이아웃이 안 잡혔을 수 있다
    const raf = window.requestAnimationFrame(measure);
    const timer = window.setInterval(measure, POLL_MS);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(raf);
      window.clearInterval(timer);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
      observer?.disconnect();
    };
  }, [anchor, enabled]);

  // 단계가 바뀐 직후 아직 측정 전이면 null → 스포트라이트 없이 설명 카드만 뜬다
  if (!enabled || !anchor || measured?.anchor !== anchor) return null;
  return measured.rect;
}

/** 뷰포트 높이. 설명 카드를 스포트라이트 반대쪽에 놓을 때 쓴다. */
export function useViewportHeight(enabled: boolean): number {
  const [height, setHeight] = useState(() =>
    typeof window === 'undefined' ? 0 : window.innerHeight,
  );

  useEffect(() => {
    if (!enabled) return;
    const update = () => setHeight(window.innerHeight);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [enabled]);

  return height;
}
