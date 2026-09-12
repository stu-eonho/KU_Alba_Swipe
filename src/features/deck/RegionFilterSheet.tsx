/**
 * OWNER: 개발자 B (deck-interaction) — 단독 소유
 *
 * 지역 필터 하단 시트. 시·도 17개를 다중 선택하고(1단계), 시·도 안에서
 * 구/시/군까지 좁힐 수 있다(2단계, PHASE8 G7).
 *
 * 구조·접근성은 ConfirmDialog 를 그대로 따라간다:
 *  백드롭 탭 닫기 · Escape · 포커스 트랩 · body 스크롤 잠금 · 닫은 뒤 트리거로 포커스 복귀.
 * 중앙 다이얼로그가 아니라 하단 시트인 이유는 칩이 17개라 세로로 길어서다 —
 * 엄지 근처에서 열려야 한 손으로 고를 수 있다.
 *
 * CRITICAL: Escape 와 백드롭은 **시트 자체를 닫는다.** 2단계(area 뷰)에서 Escape 가
 * 1단계로만 되돌아가면 사용자가 시트를 빠져나갈 방법이 없다.
 * 단계 뒤로가기는 헤더의 뒤로가기 **버튼으로만** 한다.
 *
 * 칩은 Chip 프리미티브를 쓰지 않는다. Chip 은 읽기 전용 태그라서 클릭 핸들러를
 * 붙이지 않기로 한 계약이다(Chip.tsx 주석). 여기서는 같은 치수의 <button> 을 직접 그린다.
 *
 * 레드는 CTA 하나에만: "적용" 버튼과 선택된 칩. "전국" 토글은 중립이다.
 *
 * 초안(draft) 을 지역 상태로 들고 있다가 "적용" 에서만 부모에게 올린다 —
 * 칩을 누를 때마다 덱이 재정렬되면 고르는 동안 화면이 계속 흔들린다.
 */
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui';
import { REGIONS } from '@/types';
import { makeRegion, parseRegion } from './regionStorage';

/**
 * 구가 없는 시·도. 세종은 주소 두 번째 조각이 `어진동`(동 단위)이라
 * 2단계를 만들어도 의미가 없다 — 화살표를 숨기고 시·도 전체로만 고르게 한다.
 */
const CITIES_WITHOUT_AREA: readonly string[] = ['세종'];

export type RegionFilterSheetProps = {
  open: boolean;
  /** 현재 적용된 지역. 빈 배열이면 전국. `"서울"` 또는 `"서울>서대문구"`. */
  value: string[];
  /**
   * 시·도별로 실제 공고가 있는 구/시/군 목록. 화면이 덱 데이터에서 뽑아 넘긴다 —
   * 전국 250개 행정구역을 상수로 박아 두면 공고가 없는 구까지 고를 수 있게 된다.
   */
  areasByCity?: Record<string, string[]>;
  /** "적용"을 눌렀을 때만 호출된다. */
  onApply: (regions: string[]) => void;
  /** 백드롭 탭 · Escape · 닫기 버튼 */
  onClose: () => void;
};

/**
 * open 게이트만 담당한다. 내용은 열릴 때마다 새로 마운트되므로
 * 초안 상태(와 단계 상태)를 이펙트로 되돌릴 필요가 없다.
 */
export function RegionFilterSheet({ open, ...rest }: RegionFilterSheetProps) {
  if (!open) return null;
  return <RegionFilterPanel {...rest} />;
}

function RegionFilterPanel({
  value,
  areasByCity = {},
  onApply,
  onClose,
}: Omit<RegionFilterSheetProps, 'open'>) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [draft, setDraft] = useState<string[]>(value);

  /** 1단계(시·도 목록) ↔ 2단계(그 시·도의 구 목록). 시트를 새로 만들지 않는다. */
  const [view, setView] = useState<{ mode: 'city' } | { mode: 'area'; city: string }>({
    mode: 'city',
  });

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
        // CRITICAL: 단계와 무관하게 시트를 닫는다. 위 주석 참조.
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

  /** 그 시·도에 걸린 선택(시·도 전체 + 구 단위)을 전부 뺀 배열 */
  const withoutCity = useCallback(
    (list: string[], city: string) => list.filter((entry) => parseRegion(entry).city !== city),
    [],
  );

  /** 시·도 칩 본체: 눌리면 그 시·도 전체, 다시 누르면 해제(구 선택도 같이 사라진다) */
  const toggleCity = useCallback(
    (city: string) => {
      setDraft((prev) =>
        prev.some((entry) => parseRegion(entry).city === city)
          ? withoutCity(prev, city)
          : [...prev, city],
      );
    },
    [withoutCity],
  );

  /** 구 칩: 그 구만 켜고 끈다. 구를 고르면 "시·도 전체" 항목은 물러난다. */
  const toggleArea = useCallback((city: string, area: string) => {
    const key = makeRegion(city, area);
    setDraft((prev) =>
      prev.includes(key)
        ? prev.filter((entry) => entry !== key)
        : [...prev.filter((entry) => entry !== city), key],
    );
  }, []);

  /** 2단계 맨 위의 "{시·도} 전체" — 그 시·도의 구 선택을 걷어내고 시·도만 남긴다 */
  const selectWholeCity = useCallback(
    (city: string) => setDraft((prev) => [...withoutCity(prev, city), city]),
    [withoutCity],
  );

  const selectedCities = useMemo(
    () => new Set(draft.map((entry) => parseRegion(entry).city)),
    [draft],
  );

  /** 시·도별로 고른 구의 개수. 0 이면 시·도 전체(또는 미선택)다. */
  const areaCountByCity = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const entry of draft) {
      const { city, area } = parseRegion(entry);
      if (area) counts[city] = (counts[city] ?? 0) + 1;
    }
    return counts;
  }, [draft]);

  // "전국" = 필터 없음. 전체 해제가 곧 전국이다.
  const nationwide = draft.length === 0;

  const areaCity = view.mode === 'area' ? view.city : null;
  const areas = areaCity ? (areasByCity[areaCity] ?? []) : [];

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
          <div className="flex min-w-0 items-center gap-1">
            {areaCity && (
              <button
                type="button"
                aria-label="시·도 목록으로"
                onClick={() => setView({ mode: 'city' })}
                className="text-muted active:bg-subtle -ml-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full transition-transform duration-100 ease-out select-none active:scale-[0.97]"
              >
                <ChevronLeft size={20} strokeWidth={1.75} aria-hidden />
              </button>
            )}
            <h2
              id={titleId}
              className={clsx(
                'text-ink truncate text-[18px] leading-[1.35] font-semibold',
                !areaCity && 'pl-1',
              )}
            >
              {areaCity ? `${areaCity} 지역 선택` : '지역 선택'}
            </h2>
          </div>
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
          {areaCity ? (
            <div className="flex flex-wrap gap-2">
              <RegionChip
                label={`${areaCity} 전체`}
                selected={draft.includes(areaCity)}
                onClick={() => selectWholeCity(areaCity)}
                className="mb-1 w-full justify-center"
              />
              {areas.map((area) => (
                <RegionChip
                  key={area}
                  label={area}
                  selected={draft.includes(makeRegion(areaCity, area))}
                  onClick={() => toggleArea(areaCity, area)}
                />
              ))}
              {areas.length === 0 && (
                <p className="text-faint px-1 py-2 text-[14px] leading-[1.35]">
                  지금 볼 수 있는 공고가 없는 지역이에요
                </p>
              )}
            </div>
          ) : (
            <>
              {/* 전국 토글. 눌리면 전체 해제 = 필터 없음 */}
              <RegionChip
                label="전국"
                selected={nationwide}
                onClick={() => setDraft([])}
                className="mb-3"
              />

              <div className="flex flex-wrap gap-2">
                {REGIONS.map((region) => (
                  <CityRow
                    key={region}
                    city={region}
                    selected={selectedCities.has(region)}
                    areaCount={areaCountByCity[region] ?? 0}
                    // 세종은 구가 없어 2단계를 만들지 않는다
                    hasAreas={!CITIES_WITHOUT_AREA.includes(region)}
                    onToggle={() => toggleCity(region)}
                    onOpenAreas={() => setView({ mode: 'area', city: region })}
                  />
                ))}
              </div>
            </>
          )}
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
 * 시·도 한 줄: [칩 본체 = 시·도 전체 선택] [화살표 = 구 목록으로].
 *
 * CRITICAL: 버튼 안에 버튼을 넣지 않는다. 무효 HTML 이고 클릭이 두 타겟에 겹쳐 엉킨다.
 * `role="group"` 컨테이너 안에 형제 버튼 두 개로 둔다.
 */
function CityRow({
  city,
  selected,
  areaCount,
  hasAreas,
  onToggle,
  onOpenAreas,
}: {
  city: string;
  selected: boolean;
  areaCount: number;
  hasAreas: boolean;
  onToggle: () => void;
  onOpenAreas: () => void;
}) {
  return (
    <div
      role="group"
      aria-label={city}
      className={clsx(
        'inline-flex h-9 items-center overflow-hidden rounded-full border',
        selected ? 'bg-brand-soft border-brand' : 'bg-surface border-line',
      )}
    >
      <button
        type="button"
        aria-pressed={selected}
        onClick={onToggle}
        className={clsx(
          'touch-44 inline-flex h-9 items-center pl-4 text-[14px] leading-[1.3] font-medium whitespace-nowrap',
          hasAreas ? 'pr-2' : 'pr-4',
          'transition-transform duration-100 ease-out select-none active:scale-[0.97]',
          selected ? 'text-brand' : 'text-body',
        )}
      >
        {city}
        {areaCount > 0 && <span className="ml-1 text-[12px] leading-[1.3]">{areaCount}</span>}
      </button>
      {hasAreas && (
        <button
          type="button"
          aria-label={`${city} 구·시·군 고르기`}
          onClick={onOpenAreas}
          className={clsx(
            'touch-44 inline-flex h-9 items-center pr-3 pl-1',
            'transition-transform duration-100 ease-out select-none active:scale-[0.97]',
            selected ? 'text-brand' : 'text-faint',
          )}
        >
          <ChevronRight size={16} strokeWidth={1.75} aria-hidden />
        </button>
      )}
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
