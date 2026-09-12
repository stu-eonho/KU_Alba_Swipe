/**
 * OWNER: 개발자 B (screen-composer) — 단독 소유
 *
 * PHASE2_PLAN.md B-4 · F6 — 첫 가입자 튜토리얼 전체 화면 오버레이.
 *
 * 4장 · 우상단 X(건너뛰기) · 하단 "다음"/"시작하기" · 하단 중앙 점 인디케이터.
 * 본 적 있는지는 localStorage 로만 판단한다(tutorialStorage.ts). DB를 쓰지 않는다.
 *
 * 디자인 — DESIGN_Swipe.md (Blind):
 *  - 그림자 0. 구조는 1px 헤어라인과 틴트로만 만든다
 *  - 타이포 최대 18px, 강조는 600. 700/800 을 쓰지 않는다
 *  - 레드(bg-brand)는 CTA 버튼 하나에만. 아이콘·점 인디케이터는 잉크/그레이
 *  - 모션은 페이드만. 등장 200ms(ease-standard) / 퇴장 120ms(ease-exit),
 *    스프링·오버슈트·축하 모션 없음
 *
 * 접근성: role="dialog" + aria-modal, Escape 로 닫기(= 건너뛰기), 포커스 트랩,
 *         닫은 뒤 직전 포커스 복귀, body 스크롤 잠금, prefers-reduced-motion 이면 즉시 전환.
 */
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { X } from 'lucide-react';
import { Button, IconButton } from '@/components/ui';
import { TUTORIAL_SLIDES } from './tutorialSlides';
import { hasSeenTutorial, markTutorialSeen, resetTutorial } from './tutorialStorage';

/* DESIGN_Swipe.md Motion & Easing — globals.css 의 --ease-standard / --ease-exit 와 같은 값 */
const ENTER_SEC = 0.2;
const EXIT_SEC = 0.12;
const EASE_STANDARD: [number, number, number, number] = [0.25, 0.1, 0.25, 1];
const EASE_EXIT: [number, number, number, number] = [0.4, 0, 1, 1];

/** 좌우 스와이프로 장을 넘기는 최소 이동 거리. 보조 수단이라 버튼보다 관대하게 잡지 않는다. */
const SWIPE_MIN_PX = 48;

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

export type TutorialProps = {
  /**
   * 생략하면 localStorage 로 스스로 판단한다(기본 사용법 — 라우터에서 `<Tutorial />`).
   * 값을 주면 제어 컴포넌트가 된다. 설정의 "튜토리얼 다시 보기" 같은 데서 쓴다.
   */
  open?: boolean;
  /** 건너뛰기 · 시작하기 · Escape 로 닫힐 때 호출된다. 닫기 전에 항상 "봤음"을 기록한다. */
  onClose?: () => void;
};

export function Tutorial({ open, onClose }: TutorialProps) {
  const isControlled = open !== undefined;
  // 최초 렌더에서 한 번만 읽는다. 렌더마다 localStorage 를 때리지 않는다.
  const [selfOpen, setSelfOpen] = useState(() => !hasSeenTutorial());
  const visible = isControlled ? open : selfOpen;

  const [index, setIndex] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();
  const titleId = useId();
  const bodyId = useId();

  const slide = TUTORIAL_SLIDES[index];
  const isLast = index === TUTORIAL_SLIDES.length - 1;

  const close = useCallback(() => {
    markTutorialSeen();
    setIndex(0);
    if (!isControlled) setSelfOpen(false);
    onClose?.();
  }, [isControlled, onClose]);

  // 인라인 화살표 함수를 넘겨도 keydown 이펙트가 재실행되지 않도록 ref 에 담는다
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  }, [close]);

  const goNext = useCallback(() => {
    setIndex((i) => Math.min(i + 1, TUTORIAL_SLIDES.length - 1));
  }, []);
  const goPrev = useCallback(() => {
    setIndex((i) => Math.max(i - 1, 0));
  }, []);

  /** 데모 리허설용: 개발 빌드에서 콘솔에 `__albaswipeResetTutorial()` 을 노출한다. */
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    window.__albaswipeResetTutorial = resetTutorial;
    return () => {
      delete window.__albaswipeResetTutorial;
    };
  }, []);

  /** 포커스 트랩 + Escape + 스크롤 잠금 + 포커스 복귀 */
  useEffect(() => {
    if (!visible) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    // 첫 포커스는 건너뛰기(X)가 아니라 주 동작인 "다음"으로 간다
    panelRef.current?.querySelector<HTMLElement>('[data-tutorial-primary]')?.focus();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closeRef.current();
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setIndex((i) => Math.min(i + 1, TUTORIAL_SLIDES.length - 1));
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setIndex((i) => Math.max(i - 1, 0));
        return;
      }
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

    // capture 단계 — 덱의 전역 화살표 단축키보다 먼저 처리한다
    document.addEventListener('keydown', handleKey, true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKey, true);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [visible]);

  /* 좌우 스와이프 — 보조 수단. 버튼이 우선이며 동작하지 않아도 기능 손실이 없다. */
  const dragStartX = useRef<number | null>(null);
  const handlePointerDown = (e: React.PointerEvent) => {
    dragStartX.current = e.clientX;
  };
  const handlePointerUp = (e: React.PointerEvent) => {
    const start = dragStartX.current;
    dragStartX.current = null;
    if (start === null) return;
    const dx = e.clientX - start;
    if (dx <= -SWIPE_MIN_PX) goNext();
    else if (dx >= SWIPE_MIN_PX) goPrev();
  };

  if (!visible) return null;

  const enter = prefersReduced ? { duration: 0 } : { duration: ENTER_SEC, ease: EASE_STANDARD };
  const exit = prefersReduced ? { duration: 0 } : { duration: EXIT_SEC, ease: EASE_EXIT };

  const SlideIcon = slide.Icon;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      /* .dialog-backdrop 은 200ms 페이드인 키프레임만 가진 유틸이다 (globals.css) */
      className="bg-surface dialog-backdrop fixed inset-0 z-[80]"
    >
      <div className="mx-auto flex h-[100dvh] max-w-[480px] flex-col px-6 pb-6">
        {/* 우상단 건너뛰기 — 언제든 빠져나갈 수 있다 */}
        <header className="flex justify-end pt-2">
          <IconButton label="튜토리얼 건너뛰기" onClick={close}>
            <X size={22} strokeWidth={1.75} aria-hidden />
          </IconButton>
        </header>

        <main
          className="flex flex-1 flex-col items-center justify-center text-center"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => {
            dragStartX.current = null;
          }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={slide.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: enter }}
              exit={{ opacity: 0, transition: exit }}
              className="flex flex-col items-center"
            >
              {/* 일러스트 대체 — 옅은 원 + lucide 아이콘. 그림자 없음 */}
              <div className="bg-subtle flex h-[132px] w-[132px] items-center justify-center rounded-full">
                <SlideIcon size={64} strokeWidth={1.5} className="text-ink" aria-hidden />
              </div>
              <h2 id={titleId} className="text-ink mt-8 text-[18px] leading-[1.4] font-semibold">
                {slide.title}
              </h2>
              <p
                id={bodyId}
                className="text-body mt-3 text-[14px] leading-[1.6] whitespace-pre-line"
              >
                {slide.body}
              </p>
            </motion.div>
          </AnimatePresence>
        </main>

        <footer className="flex flex-col items-center gap-5">
          {/* 점 인디케이터 — 장식이므로 보조기술에는 아래 live 영역으로 전달한다 */}
          <div className="flex items-center gap-1.5" aria-hidden>
            {TUTORIAL_SLIDES.map((s, i) => (
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
          {/* 장이 바뀌어도 스크린리더는 h2 교체를 읽어주지 않는다. 여기서 알린다. */}
          <p className="sr-only" aria-live="polite">
            {TUTORIAL_SLIDES.length}장 중 {index + 1}장. {slide.title}
          </p>

          <Button data-tutorial-primary size="lg" fullWidth onClick={isLast ? close : goNext}>
            {isLast ? '시작하기' : '다음'}
          </Button>
        </footer>
      </div>
    </div>
  );
}
