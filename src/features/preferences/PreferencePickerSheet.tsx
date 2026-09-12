/**
 * OWNER: 개발자 B (deck-interaction) — 단독 소유
 *
 * PHASE8 G8 · 관심 업종 다중 선택 하단 시트.
 *
 * 구조·접근성은 RegionFilterSheet 와 동일하게 간다 —
 * 백드롭 탭 닫기 · Escape · 포커스 트랩 · body 스크롤 잠금 · 닫은 뒤 포커스 복귀.
 * 업종 목록은 `JOB_CATEGORIES` 11종을 그대로 쓴다(A 소유, 읽기만).
 * 시드·공고 작성 폼과 같은 문자열이라야 `cat:` 가중치가 실제 공고와 맞물린다.
 *
 * 레드는 CTA 하나에만: "적용" 버튼과 선택된 칩.
 */
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';
import { Button } from '@/components/ui';
import { JOB_CATEGORIES } from '@/lib/api/jobs';
import { categoryKey } from '@/lib/recommend';

export type PreferencePickerSheetProps = {
  open: boolean;
  /** "적용"을 눌렀을 때만. 값은 `usePreferences().setInitial` 이 받는 가중치 키다 (`cat:카페`). */
  onApply: (keys: string[]) => void;
  /** 백드롭 탭 · Escape · 닫기 버튼 */
  onClose: () => void;
};

export function PreferencePickerSheet({ open, ...rest }: PreferencePickerSheetProps) {
  if (!open) return null;
  return <PreferencePickerPanel {...rest} />;
}

function PreferencePickerPanel({ onApply, onClose }: Omit<PreferencePickerSheetProps, 'open'>) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const titleId = useId();

  // 마운트 한 프레임 뒤에 켜서 transform 트랜지션이 실제로 돈다. 200ms, 스프링 없음.
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

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

    // capture 단계 — 덱의 전역 화살표/Escape 단축키보다 먼저 먹는다
    document.addEventListener('keydown', handleKey, true);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKey, true);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  const toggle = useCallback((category: string) => {
    setPicked((prev) =>
      prev.includes(category) ? prev.filter((item) => item !== category) : [...prev, category],
    );
  }, []);

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center">
      <div className="bg-backdrop dialog-backdrop absolute inset-0" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={clsx(
          'bg-surface rounded-t-pill relative flex w-full max-w-[448px] flex-col',
          'max-h-[80dvh] px-4 pt-2 pb-5',
          'transition-transform duration-200 ease-out',
          entered ? 'translate-y-0' : 'translate-y-full',
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <h2 id={titleId} className="text-ink pl-1 text-[18px] leading-[1.35] font-semibold">
            관심 업종
          </h2>
          <button
            ref={closeRef}
            type="button"
            aria-label="닫기"
            onClick={onClose}
            className="text-muted active:bg-subtle -mr-1 inline-flex size-11 shrink-0 items-center justify-center rounded-full transition-transform duration-100 ease-out select-none active:scale-[0.97]"
          >
            <X size={20} strokeWidth={1.75} aria-hidden />
          </button>
        </div>

        <p className="text-faint px-1 text-[12px] leading-[1.35]">
          고른 업종부터 먼저 보여드려요. 나중에 스와이프로 더 정확해져요
        </p>

        <div className="mt-3 min-h-0 flex-1 overflow-y-auto pb-2">
          <div className="flex flex-wrap gap-2">
            {JOB_CATEGORIES.map((category) => {
              const selected = picked.includes(category);
              return (
                <button
                  key={category}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggle(category)}
                  className={clsx(
                    'touch-44 inline-flex h-9 items-center rounded-full border px-4',
                    'text-[14px] leading-[1.3] font-medium whitespace-nowrap',
                    'transition-transform duration-100 ease-out select-none active:scale-[0.97]',
                    selected
                      ? 'bg-brand-soft text-brand border-brand'
                      : 'bg-surface text-body border-line',
                  )}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-line-soft mt-1 border-t pt-4">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            disabled={picked.length === 0}
            onClick={() => onApply(picked.map((category) => categoryKey(category)))}
          >
            적용
          </Button>
        </div>
      </div>
    </div>
  );
}
