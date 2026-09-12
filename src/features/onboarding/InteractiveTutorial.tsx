/**
 * OWNER: 개발자 B (screen-composer) — 단독 소유
 *
 * PHASE6_PLAN.md B-3 · 인터랙티브 튜토리얼.
 *
 * 사용자 요청: "배경은 약간 투명하면서, 실제로 어플 작동을 해볼 수 있게."
 * → 화면 전체를 --color-scrim(50%)으로 덮되 강조할 영역만 뚫는다. 뒤의 앱이 비쳐 보이고,
 *   ②③ 단계에서는 오버레이가 입력을 막지 않아 **진짜 카드를 밀어볼 수** 있다.
 *
 * 스포트라이트 구현 — `box-shadow: 0 0 0 9999px var(--color-scrim)`:
 *   뚫을 사각형 위치에 빈 div 를 놓고 거대한 spread 그림자를 건다. 사각형 안쪽은 칠해지지
 *   않으므로 그대로 구멍이 된다. SVG mask·clip-path 보다 호환 범위가 넓고 깨질 일이 없다.
 *   (DESIGN_Swipe.md 는 그림자를 금지하지만 이건 장식이 아니라 구현 수단이다. 예외.)
 *   그림자는 포인터를 먹지 않으므로 구멍을 통한 조작이 자연스럽게 된다.
 *
 * 입력 차단 정책:
 *   - 기다리지 않는 단계 → 전면 투명 블로커를 깔아 뒤 화면 조작을 막는다(오조작 방지)
 *   - 스와이프를 기다리는 단계 → 블로커를 걷는다. 사용자가 실제 카드를 밀어야 넘어간다
 *
 * 절대 깨지지 않기:
 *   - 앵커를 못 찾거나 rect 가 0이면 스포트라이트를 포기하고 설명 카드만 띄운다
 *   - 8초 안에 스와이프가 없으면 "다음"을 노출한다. 막히는 단계가 없다
 *   - 이 컴포넌트가 던지면 SilentBoundary 가 잡아 정보 카드 4장으로 폴백한다(Tutorial.tsx)
 *
 * 디자인: 그림자 0(스포트라이트 제외) · 타이포 18px/600 상한 · 레드는 "다음" CTA 하나 ·
 *         모션은 페이드 200ms · 터치 타겟 44px · 100dvh.
 * 접근성: role="dialog" + aria-modal, Escape 종료, 포커스 트랩, prefers-reduced-motion 즉시.
 */
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { X } from 'lucide-react';
import { Button, IconButton } from '@/components/ui';
import type { UserRole } from '@/types';
import { markTutorialSeen } from './tutorialStorage';
import {
  INTERACTIVE_STEPS,
  TUTORIAL_SWIPE_EVENT,
  TUTORIAL_WAIT_TIMEOUT_MS,
  emitTutorialActive,
  type TutorialStep,
  type TutorialSwipeDetail,
} from './tutorialSteps';
import { useAnchorRect, useViewportHeight, type AnchorRect } from './useAnchorRect';

/* globals.css 의 --ease-standard / --ease-exit 와 같은 값 */
const ENTER_SEC = 0.2;
const EXIT_SEC = 0.12;
const EASE_STANDARD: [number, number, number, number] = [0.25, 0.1, 0.25, 1];
const EASE_EXIT: [number, number, number, number] = [0.4, 0, 1, 1];

/** 스포트라이트와 설명 카드 사이 간격 */
const GAP = 16;
/** 설명 카드가 X 버튼과 겹치지 않는 최소 top */
const MIN_TOP = 68;
/** 설명 카드와 화면 가장자리 사이 최소 여백 */
const EDGE = 12;
/** 아직 카드를 못 쟀을 때 쓰는 높이 추정값 */
const CARD_FALLBACK_HEIGHT = 220;

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

export type InteractiveTutorialProps = {
  userId: string;
  /** 생략하면 localStorage 로 스스로 판단한다(Tutorial.tsx 가 넘겨준다). */
  open: boolean;
  onClose: () => void;
  /**
   * PHASE7 F9 — 역할별 단계 배열. 생략하면 구직자용.
   * **엔진은 이 배열만 갈아끼우면 된다.** 새 컴포넌트를 만들지 않는다.
   */
  steps?: readonly TutorialStep[];
  /** "봤음"을 어느 역할 키에 기록할지. 생략하면 구직자. */
  role?: UserRole;
};

export function InteractiveTutorial({
  userId,
  open,
  onClose,
  steps: stepsProp,
  role = 'seeker',
}: InteractiveTutorialProps) {
  /* 빈 배열이 들어오면 step 이 undefined 가 되어 렌더가 던진다. 구직자용으로 되돌린다. */
  const steps = stepsProp && stepsProp.length > 0 ? stepsProp : INTERACTIVE_STEPS;
  const [index, setIndex] = useState(0);
  /**
   * "다음"이 열린 단계의 id. 기다리는 단계에서만 의미가 있다.
   * 8초 경과 · 반대 방향 스와이프로 열린다. (단계 id 로 들고 있으면 단계가 바뀔 때
   * 이펙트 안에서 setState 로 되돌릴 필요가 없다 — 렌더에서 비교만 한다.)
   */
  const [unlockedStepId, setUnlockedStepId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();
  const titleId = useId();
  const bodyId = useId();

  const step = steps[index] ?? steps[0];
  const isLast = index === steps.length - 1;

  const anchorRect = useAnchorRect(open ? step.anchor : null, open);
  const viewportHeight = useViewportHeight(open);

  const close = useCallback(() => {
    markTutorialSeen(userId, role);
    setIndex(0);
    onClose();
  }, [onClose, role, userId]);

  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  }, [close]);

  const goNext = useCallback(() => {
    setIndex((i) => Math.min(i + 1, steps.length - 1));
  }, [steps.length]);

  /** 튜토리얼이 떠 있는 동안 덱의 카드 탭(상세 열기)을 막는다 — HomeDeckPage 가 듣는다. */
  useEffect(() => {
    if (!open) return;
    emitTutorialActive(true);
    return () => emitTutorialActive(false);
  }, [open]);

  /* 기다리는 단계에서 8초가 지나면 "다음"을 연다. 막히는 단계가 없어야 한다. */
  useEffect(() => {
    if (!open || !step.waitFor) return;
    const id = step.id;
    const timer = window.setTimeout(() => setUnlockedStepId(id), TUTORIAL_WAIT_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [open, step.waitFor, step.id]);

  /* 실제 스와이프 대기 — 덱이 onSwipe 안에서 띄우는 window 이벤트 하나만 듣는다. */
  useEffect(() => {
    if (!open) return;
    const waitFor = step.waitFor;
    if (!waitFor) return;
    const id = step.id;

    const onSwipe = (event: Event) => {
      const detail = (event as CustomEvent<TutorialSwipeDetail>).detail;
      if (detail?.direction === waitFor) {
        goNext();
        return;
      }
      // 반대로 밀었어도 막지 않는다. "다음"을 열어 빠져나갈 길을 준다.
      setUnlockedStepId(id);
    };

    window.addEventListener(TUTORIAL_SWIPE_EVENT, onSwipe);
    return () => window.removeEventListener(TUTORIAL_SWIPE_EVENT, onSwipe);
  }, [open, step.waitFor, step.id, goNext]);

  /**
   * 단계가 바뀌면 포커스를 오버레이 안으로 되돌린다.
   * AnimatePresence 가 이전 카드를 언마운트하면서 포커스가 body 로 빠지면 포커스 트랩이
   * 무력해져 Tab 이 뒤 화면으로 새어 나간다. 전환(120ms)이 끝난 뒤 다시 잡는다.
   */
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      const panel = panelRef.current;
      if (!panel) return;
      if (panel.contains(document.activeElement)) return;
      const primary = panel.querySelector<HTMLElement>('[data-tutorial-primary]');
      (primary ?? panel.querySelector<HTMLElement>(FOCUSABLE))?.focus();
    }, 180);
    return () => window.clearTimeout(timer);
  }, [open, index]);

  /* 포커스 트랩 + Escape + 스크롤 잠금 + 포커스 복귀 */
  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusFirst = () => {
      const primary = panelRef.current?.querySelector<HTMLElement>('[data-tutorial-primary]');
      (primary ?? panelRef.current?.querySelector<HTMLElement>(FOCUSABLE))?.focus();
    };
    focusFirst();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closeRef.current();
        return;
      }
      // ArrowLeft/Right 는 일부러 통과시킨다 — 덱의 단축키가 실제 스와이프를 일으키고,
      // 그 스와이프가 기다리는 단계를 넘긴다(키보드로도 튜토리얼을 끝낼 수 있다).
      if (e.key !== 'Tab') return;

      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKey, true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKey, true);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  /**
   * 설명 카드 실제 높이. 이걸 알아야 "스포트라이트 반대쪽"에 놓으면서도 화면 밖으로
   * 밀리지 않게 클램프할 수 있다. 이펙트가 아니라 ref 콜백에서 재서 리렌더 사슬을 줄인다.
   */
  const [cardHeight, setCardHeight] = useState(CARD_FALLBACK_HEIGHT);
  const cardObserverRef = useRef<ResizeObserver | null>(null);
  const setCardRef = useCallback((node: HTMLDivElement | null) => {
    cardObserverRef.current?.disconnect();
    cardObserverRef.current = null;
    if (!node) return;
    const apply = () => {
      const next = node.offsetHeight;
      if (next < 1) return;
      setCardHeight((prev) => (Math.abs(prev - next) < 1 ? prev : next));
    };
    apply();
    try {
      const observer = new ResizeObserver(apply);
      observer.observe(node);
      cardObserverRef.current = observer;
    } catch {
      /* ResizeObserver 가 없어도 추정값으로 동작한다 */
    }
  }, []);

  const effectiveAnchor = useMemo(() => {
    if (role !== 'employer' || !anchorRect || viewportHeight <= 0) return anchorRect;
    const freeAbove = anchorRect.top;
    const freeBelow = viewportHeight - (anchorRect.top + anchorRect.height);
    return Math.max(freeAbove, freeBelow) >= cardHeight + GAP + EDGE ? anchorRect : null;
  }, [anchorRect, cardHeight, role, viewportHeight]);

  const effectiveCardPosition = useMemo(
    () => placeCard(effectiveAnchor, viewportHeight, cardHeight, role === 'employer'),
    [effectiveAnchor, viewportHeight, cardHeight, role],
  );

  if (!open) return null;

  const waiting = Boolean(step.waitFor) && unlockedStepId !== step.id;
  /*
   * 구인자 덱은 실제 지원자가 0명일 수 있다. 이때 스와이프만 강제하면 8초 동안
   * 아무 조작도 못 하는 것처럼 보인다. 구인자에게는 실제 스와이프 입력을 열어 둔 채
   * "다음"도 즉시 제공한다. 구직자 튜토리얼의 체험 강제 흐름은 그대로 유지한다.
   */
  const showNext = !waiting || role === 'employer';
  const enter = prefersReduced ? { duration: 0 } : { duration: ENTER_SEC, ease: EASE_STANDARD };
  const exit = prefersReduced ? { duration: 0 } : { duration: EXIT_SEC, ease: EASE_EXIT };
  const padding = step.padding ?? 6;
  const radius = step.radius ?? 12;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      /*
       * pointer-events-none 이 기본이다. 필요한 조각(블로커 · 설명 카드 · 버튼)만 auto 로 켠다.
       * overflow-hidden: 9999px 그림자가 스크롤 영역을 만드는 것을 막는다.
       * h-[100dvh]: iOS 주소창이 접힐 때 100vh 는 어긋난다.
       */
      className="pointer-events-none fixed inset-0 z-[80] h-[100dvh] overflow-hidden"
    >
      {/* 기다리지 않는 단계에서는 뒤 화면 조작을 막는다. 기다리는 단계에서는 걷는다. */}
      {!waiting && <div className="pointer-events-auto absolute inset-0" aria-hidden />}

      {effectiveAnchor ? (
        /* 스포트라이트 — 이 사각형만 칠해지지 않아 뒤의 앱이 그대로 보인다 */
        <div
          aria-hidden
          className="dialog-backdrop pointer-events-none fixed"
          style={{
            top: effectiveAnchor.top - padding,
            left: effectiveAnchor.left - padding,
            width: effectiveAnchor.width + padding * 2,
            height: effectiveAnchor.height + padding * 2,
            borderRadius: radius,
            boxShadow: '0 0 0 9999px var(--color-scrim)',
          }}
        />
      ) : (
        /* 앵커를 못 찾았다 — 스포트라이트를 포기하고 반투명 막만 깐다. 절대 깨지지 않는다. */
        <div
          aria-hidden
          className="dialog-backdrop pointer-events-none absolute inset-0"
          style={{ background: 'var(--color-scrim)' }}
        />
      )}

      {/* 우상단 건너뛰기 — 언제든 빠져나갈 수 있다 */}
      {role !== 'employer' && (
        <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto flex max-w-[480px] justify-end px-4 pt-3">
          <IconButton
            label="튜토리얼 건너뛰기"
            variant="scrim"
            className="pointer-events-auto"
            onClick={close}
          >
            <X size={22} strokeWidth={1.75} aria-hidden />
          </IconButton>
        </div>
      )}

      {/* 설명 카드 */}
      <div
        ref={setCardRef}
        className={`pointer-events-none absolute left-1/2 w-full -translate-x-1/2 px-4 ${
          role === 'employer' ? 'max-w-[392px]' : 'max-w-[480px]'
        }`}
        style={effectiveCardPosition}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: enter }}
            exit={{ opacity: 0, transition: exit }}
            className={`bg-surface border-line pointer-events-auto rounded-card border ${
              role === 'employer' ? 'p-4' : 'p-5'
            }`}
          >
            <div className="flex items-start gap-2">
              <h2
                id={titleId}
                className={`text-ink min-w-0 flex-1 leading-[1.4] font-semibold ${
                  role === 'employer' ? 'pt-2 text-[17px]' : 'text-[18px]'
                }`}
              >
                {step.title}
              </h2>
              {role === 'employer' && (
                <IconButton
                  label="튜토리얼 건너뛰기"
                  size={44}
                  variant="plain"
                  className="-mt-1 -mr-2 shrink-0"
                  onClick={close}
                >
                  <X size={20} strokeWidth={1.75} aria-hidden />
                </IconButton>
              )}
            </div>
            <p id={bodyId} className="text-body mt-2 text-[14px] leading-[1.6] whitespace-pre-line">
              {step.body}
            </p>

            {waiting && (
              <p className="text-faint mt-3 text-[12px] leading-[1.4]">
                {role === 'employer'
                  ? '지원자에게 바로 알림이 갑니다'
                  : '직접 한 번 해보세요. 잠시 뒤 건너뛸 수 있어요'}
              </p>
            )}

            <div
              className={`${role === 'employer' ? 'mt-4 gap-3' : 'mt-5 gap-4'} flex flex-col items-center`}
            >
              {/* 점 인디케이터 — 장식. 보조기술에는 아래 live 영역으로 전달한다 */}
              <div className="flex items-center gap-1.5" aria-hidden>
                {steps.map((s, i) => (
                  <span
                    key={s.id}
                    className={
                      i === index
                        ? 'bg-ink h-1.5 w-1.5 rounded-full'
                        : 'bg-line h-1.5 w-1.5 rounded-full'
                    }
                  />
                ))}
              </div>

              {/*
                기다리는 동안에는 버튼 자리를 비워 두되 높이를 유지한다.
                버튼이 나타나면서 카드가 커지면 스포트라이트를 덮칠 수 있다.
              */}
              {!showNext ? (
                <div className="h-11" aria-hidden />
              ) : (
                <Button data-tutorial-primary size="md" fullWidth onClick={isLast ? close : goNext}>
                  {isLast ? '시작하기' : '다음'}
                </Button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <p className="sr-only" aria-live="polite">
        {steps.length}단계 중 {index + 1}단계. {step.title}. {step.body}
      </p>
    </div>
  );
}

/**
 * 설명 카드를 스포트라이트 반대쪽에 놓는다. 여백이 넓은 쪽을 고르고, 화면 밖으로
 * 밀리지 않게 클램프한다. 앵커가 없으면(= 스포트라이트 포기) 화면 중앙.
 *
 * 덱처럼 앵커가 화면 높이의 대부분을 차지하면 어느 쪽에도 카드가 온전히 들어가지 않는다.
 * 그때는 클램프가 이겨서 카드가 스포트라이트 아래쪽 끝을 살짝 덮는다 — 카드가 화면 밖으로
 * 나가 안내를 못 읽는 것보다 낫다.
 */
function placeCard(
  rect: AnchorRect | null,
  viewportHeight: number,
  cardHeight: number,
  compact = false,
): React.CSSProperties {
  if (viewportHeight <= 0) return { top: MIN_TOP };

  if (!rect) {
    return {
      top: Math.max(compact ? EDGE : MIN_TOP, Math.round((viewportHeight - cardHeight) / 2)),
    };
  }

  const freeBelow = viewportHeight - (rect.top + rect.height);
  const freeAbove = rect.top;

  if (freeBelow >= freeAbove) {
    const maxTop = Math.max(MIN_TOP, viewportHeight - cardHeight - EDGE);
    return { top: clamp(rect.top + rect.height + GAP, MIN_TOP, maxTop) };
  }

  const maxBottom = Math.max(EDGE, viewportHeight - cardHeight - MIN_TOP);
  return { bottom: clamp(viewportHeight - rect.top + GAP, EDGE, maxBottom) };
}
