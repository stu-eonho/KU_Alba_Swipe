/**
 * OWNER: 개발자 B (deck-interaction) — 단독 소유
 *
 * ALBASWIPE_SPEC.md <flip_interaction>
 *   1. 백드롭 bg-backdrop 페이드 인 200ms
 *   2. motion layoutId(`card-${job.id}`)로 격자 셀 → 확대 카드.
 *      목표 크기 calc(100% - 48px) × min(70dvh, 520px), 중앙 정렬
 *   3. 동시에 rotateY 0 → 180deg, 520ms, cubic-bezier(0.22, 1, 0.36, 1)
 *      컨테이너 perspective 1200px, 양면 backface-visibility: hidden, 뒷면 초기 rotateY(180deg)
 *   4. 닫기: 백드롭 탭 / 우상단 X / Escape → 역방향으로 격자 셀 자리 복귀
 *
 * 구조가 두 겹인 이유 (중요):
 *   바깥 motion.div  — `layoutId`. motion의 layout projection이 transform을 직접 덮어쓴다
 *   안쪽 motion.div  — `rotateY` + preserve-3d
 * **한 요소에 layoutId와 rotateY를 같이 주면 layout projection이 회전을 덮어써 카드가 깨진다.**
 * perspective는 motion의 transform prop이 아니라 순수 CSS 속성이라 바깥 요소에 줘도 안전하다
 * (transform으로 넣으려면 `transformPerspective`를 써야 하는데, 그러면 projection과 충돌한다).
 *
 * 닫기는 확대 카드를 즉시 언마운트한다. 같은 layoutId를 가진 격자 셀이 남아 있으므로
 * motion이 그 셀을 확대 카드의 마지막 박스에서부터 제자리로 되돌린다 = 역방향 애니메이션.
 */
import { useEffect, useId, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Chip } from '@/components/ui';
import type { Job, Review } from '@/types';
import { BackFace } from './BackFace';
import { gridCardLayoutId } from './GridCard';
import { JobThumb, formatWage, jobAriaLabel } from './jobPresentation';
import {
  BACKDROP_MS,
  FLIP_ENABLED,
  FLIP_TRANSITION,
  INSTANT_TRANSITION,
  PERSPECTIVE_PX,
} from './flipMotion';

/** 양면 공통 — 겹쳐 보이지 않게 양쪽 다 backface-visibility: hidden */
const FACE_STYLE: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  backfaceVisibility: 'hidden',
  WebkitBackfaceVisibility: 'hidden',
  overflow: 'hidden',
};

export type ExpandedCardProps = {
  /** null이면 닫힌 상태. 격자 셀 탭으로 세팅된다 */
  job: Job | null;
  /** 백드롭 탭 · 우상단 X · Escape 모두 이걸 부른다 */
  onClose: () => void;
  /**
   * 뒷면에 노출할 리뷰. 생략하면 BackFace가 목데이터에서 파생한다.
   * TODO(통합): A의 useReviews 완성 시 호출부에서 넘긴다
   */
  reviews?: Review[];
};

/**
 * 확대 카드 앞면 — 격자 셀과 같은 내용을 보여준다.
 * 뒤집기 전반부(약 260ms) 동안 보이므로 격자 셀과 시각적으로 이어져야 한다.
 * 그래서 타이포·비율을 GridCard 앞면과 동일하게 맞췄다.
 */
function FrontFace({ job }: { job: Job }) {
  return (
    <div aria-hidden className="bg-surface flex h-full w-full flex-col">
      <div className="bg-subtle h-[45%] w-full shrink-0 overflow-hidden">
        <JobThumb job={job} iconSize={48} />
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-1 p-3">
        <p className="clamp-1 text-ink text-[14px] leading-[1.35] font-bold">{job.storeName}</p>
        <div>
          <Chip variant="neutral" size="sm">
            {job.category}
          </Chip>
        </div>
        <p className="tabular text-brand text-[18px] leading-[1.2] font-extrabold">
          {formatWage(job.hourlyWage)}
        </p>
        <p className="clamp-2 text-faint text-[12px] leading-[1.4]">{job.summary}</p>
      </div>
    </div>
  );
}

export function ExpandedCard({ job, onClose, reviews }: ExpandedCardProps) {
  const open = job !== null;
  const prefersReduced = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const labelId = useId();

  // 호출부가 인라인 화살표 함수를 넘겨도 이펙트가 재실행되지 않도록 ref에 담는다
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;

      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
      );
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

    // capture 단계 — 페이지의 전역 단축키(덱의 ArrowLeft/Right 등)보다 먼저 처리한다.
    // ConfirmDialog와 동일한 패턴이라 둘이 겹쳐도 위에 열린 쪽이 먼저 먹는다.
    document.addEventListener('keydown', handleKey, true);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKey, true);
      document.body.style.overflow = prevOverflow;
      // 닫은 뒤 원래 격자 셀로 포커스 복귀
      previouslyFocused?.focus?.();
    };
  }, [open]);

  const transition = prefersReduced ? INSTANT_TRANSITION : FLIP_TRANSITION;
  const flip = FLIP_ENABLED && !prefersReduced;

  return (
    <>
      {/* 1. 백드롭 — 닫을 때도 200ms에 걸쳐 사라져야 해서 AnimatePresence로 감싼다 */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="expanded-backdrop"
            className="bg-backdrop fixed inset-0 z-[50]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReduced ? 0 : BACKDROP_MS / 1000, ease: 'easeOut' }}
            onClick={onClose}
            aria-hidden
          />
        )}
      </AnimatePresence>

      {/* 2·3. 확대 + 뒤집기. 닫으면 즉시 언마운트되고 같은 layoutId의 격자 셀이 제자리로 되돌아간다 */}
      {open && job && (
        <div className="pointer-events-none fixed inset-0 z-[51] flex items-center justify-center">
          <motion.div
            layoutId={gridCardLayoutId(job.id)}
            transition={transition}
            /* perspective는 transform이 아니라 CSS 속성이라 layout projection과 충돌하지 않는다 */
            style={{ perspective: PERSPECTIVE_PX }}
            className="rounded-tile bg-surface shadow-card pointer-events-auto relative h-[min(70dvh,520px)] w-[calc(100%-48px)] max-w-[432px] overflow-hidden"
          >
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={labelId}
              tabIndex={-1}
              className="relative h-full w-full outline-none"
              initial={{ rotateY: 0 }}
              animate={{ rotateY: flip ? 180 : 0 }}
              transition={transition}
              style={{
                transformStyle: 'preserve-3d',
                WebkitTransformStyle: 'preserve-3d',
              }}
            >
              <span id={labelId} className="sr-only">
                {jobAriaLabel(job)} 상세
              </span>

              {/* 앞면 — 회전을 포기한 폴백에서는 렌더하지 않는다 */}
              {flip && (
                <div style={FACE_STYLE}>
                  <FrontFace job={job} />
                </div>
              )}

              {/* 뒷면 — 초기값 rotateY(180deg) */}
              <div
                style={{
                  ...FACE_STYLE,
                  transform: flip ? 'rotateY(180deg)' : undefined,
                }}
              >
                <BackFace job={job} reviews={reviews} onClose={onClose} onBeforeApply={onClose} />
              </div>
            </motion.div>
          </motion.div>
        </div>
      )}
    </>
  );
}
