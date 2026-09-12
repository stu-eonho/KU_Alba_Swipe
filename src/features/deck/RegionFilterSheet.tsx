/**
 * OWNER: 개발자 B (deck-interaction) — 단독 소유
 *
 * 지역 필터 하단 시트. 시·도 17개를 다중 선택한다.
 *
 * 구조·접근성은 ConfirmDialog 를 그대로 따라간다:
 *  백드롭 탭 닫기 · Escape · 포커스 트랩 · body 스크롤 잠금 · 닫은 뒤 트리거로 포커스 복귀.
 * 중앙 다이얼로그가 아니라 하단 시트인 이유는 칩이 17개라 세로로 길어서다 —
 * 엄지 근처에서 열려야 한 손으로 고를 수 있다.
 *
 * 칩은 Chip 프리미티브를 쓰지 않는다. Chip 은 읽기 전용 태그라서 클릭 핸들러를
 * 붙이지 않기로 한 계약이다(Chip.tsx 주석). 여기서는 같은 치수의 <button> 을 직접 그린다.
 *
 * 레드는 CTA 하나에만: "적용" 버튼과 선택된 칩. "전국" 토글은 중립이다.
 *
 * 초안(draft) 을 지역 상태로 들고 있다가 "적용" 에서만 부모에게 올린다 —
 * 칩을 누를 때마다 덱이 재정렬되면 고르는 동안 화면이 계속 흔들린다.
 */
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';
import { Button } from '@/components/ui';
import { REGIONS } from '@/types';

export type RegionFilterSheetProps = {
  open: boolean;
  /** 현재 적용된 지역. 빈 배열이면 전국. */
  value: string[];
  /** "적용"을 눌렀을 때만 호출된다. */
  onApply: (regions: string[]) => void;
  /** 백드롭 탭 · Escape · 닫기 버튼 */
  onClose: () => void;
};

/**
 * open 게이트만 담당한다. 내용은 열릴 때마다 새로 마운트되므로
 * 초안 상태를 이펙트로 되돌릴 필요가 없다.
 */
export function RegionFilterSheet({ open, ...rest }: RegionFilterSheetProps) {
  if (!open) return null;
  return <RegionFilterPanel {...rest} />;
}

function RegionFilterPanel({ value, onApply, onClose }: Omit<RegionFilterSheetProps, 'open'>) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [draft, setDraft] = useState<string[]>(value);

  // 마운트 직후 한 프레임 뒤에 켜서 transform 트랜지션이 실제로 돌게 한다.
  // 애니메이션은 transform/opacity 만, 200ms, 스프링 없음.
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const titleId = useId();

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

  const toggle = useCallback((region: string) => {
    setDraft((prev) =>
      prev.includes(region) ? prev.filter((r) => r !== region) : [...prev, region],
    );
  }, []);

  // "전국" = 필터 없음. 전체 해제가 곧 전국이다.
  const nationwide = draft.length === 0;

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
            지역 선택
          </h2>
          {/* IconButton 은 ref prop 을 노출하지 않는다(계약을 지금 바꾸지 않는다).
              초기 포커스를 잡아야 해서 여기서만 동일 스타일의 네이티브 button 을 쓴다. */}
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

        <div className="mt-1 min-h-0 flex-1 overflow-y-auto pb-2">
          {/* 전국 토글. 눌리면 전체 해제 = 필터 없음 */}
          <RegionChip
            label="전국"
            selected={nationwide}
            onClick={() => setDraft([])}
            className="mb-3"
          />

          <div className="flex flex-wrap gap-2">
            {REGIONS.map((region) => (
              <RegionChip
                key={region}
                label={region}
                selected={draft.includes(region)}
                onClick={() => toggle(region)}
              />
            ))}
          </div>
        </div>

        <div className="border-line-soft mt-1 border-t pt-4">
          <Button variant="primary" size="lg" fullWidth onClick={() => onApply(draft)}>
            적용
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * 선택 가능한 지역 칩. Chip 과 같은 모양이되 button 이다.
 * 높이 36px 은 터치 타겟 44px 하한에 못 미치므로 touch-44 로 투명 히트 영역을 깐다.
 */
function RegionChip({
  label,
  selected,
  onClick,
  className,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={clsx(
        'touch-44 inline-flex h-9 items-center rounded-full border px-4',
        'text-[14px] leading-[1.3] font-medium whitespace-nowrap',
        'transition-transform duration-100 ease-out select-none active:scale-[0.97]',
        selected ? 'bg-brand-soft text-brand border-brand' : 'bg-surface text-body border-line',
        className,
      )}
    >
      {label}
    </button>
  );
}
