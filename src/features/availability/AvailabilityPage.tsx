/**
 * OWNER: 개발자 B (deck-interaction) — 단독 소유
 *
 * "가능한 시간" 등록 화면. 홈의 안내("가능한 시간을 등록하면 딱 맞는 공고만
 * 보여드려요")가 가리키던 화면이 지금까지 없었습니다.
 *
 * 라우트 연결은 이 파일이 하지 않습니다 — `router.tsx` 는 다른 담당자 소유입니다.
 * 컴포넌트만 export 하고, 연결은 `index.ts` 를 통해 가져다 쓰면 됩니다.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Skeleton, useToast } from '@/components/ui';
import { useAvailability } from '@/hooks/useAvailability';
import { AvailabilityGrid } from './AvailabilityGrid';
import {
  COL_COUNT,
  availabilityToCells,
  cellKey,
  cellsToAvailability,
  cellsToHours,
  colOfKey,
  hourToRow,
  type CellKey,
} from './gridModel';

type Preset = { id: string; label: string; startHour: number; endHour: number };

const PRESETS: Preset[] = [
  { id: 'morning', label: '오전 09-13', startHour: 9, endHour: 13 },
  { id: 'afternoon', label: '오후 13-18', startHour: 13, endHour: 18 },
  { id: 'evening', label: '저녁 18-23', startHour: 18, endHour: 23 },
];

export function AvailabilityPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { availability, isLoading, save, isSaving } = useAvailability();

  const [selected, setSelected] = useState<Set<CellKey>>(() => new Set());
  // 저장돼 있던 값으로 한 번만 채운다. 매번 덮으면 사용자가 지운 칸이 되살아난다.
  const seeded = useRef(false);

  useEffect(() => {
    if (seeded.current || isLoading) return;
    seeded.current = true;
    setSelected(availabilityToCells(availability));
  }, [availability, isLoading]);

  /**
   * 프리셋이 적용될 요일. 이미 칠한 요일이 있으면 그 요일들에만,
   * 하나도 없으면 7일 전체에 적용한다.
   */
  const applyPreset = useCallback((preset: Preset) => {
    setSelected((current) => {
      const touched = new Set<number>();
      current.forEach((key) => touched.add(colOfKey(key)));

      const cols =
        touched.size > 0
          ? [...touched]
          : Array.from({ length: COL_COUNT }, (_, index) => index);

      const startRow = hourToRow(preset.startHour);
      const endRow = hourToRow(preset.endHour);

      const keys: CellKey[] = [];
      for (const col of cols) {
        for (let row = startRow; row < endRow; row += 1) keys.push(cellKey(col, row));
      }

      // 이미 전부 켜져 있으면 끈다 — 같은 칩을 다시 눌러 되돌릴 수 있다
      const allOn = keys.every((key) => current.has(key));
      const next = new Set(current);
      for (const key of keys) {
        if (allOn) next.delete(key);
        else next.add(key);
      }
      return next;
    });
  }, []);

  const clearAll = useCallback(() => setSelected(new Set()), []);

  const { list, mergedDays } = useMemo(() => cellsToAvailability(selected), [selected]);
  const hours = cellsToHours(selected);

  async function handleSave() {
    try {
      await save(list);
      toast.success('가능한 시간을 저장했어요');
      navigate('/');
    } catch {
      toast.error('저장하지 못했어요. 다시 시도해 주세요');
    }
  }

  return (
    <div className="px-4 pt-3 pb-[calc(84px+env(safe-area-inset-bottom))]">
      <p className="text-[14px] leading-[1.5] text-muted">
        가능한 시간을 칠해주세요. 겹치는 공고만 보여드려요.
      </p>

      {/* 프리셋 — 드래그가 어려운 사람도, 키보드 사용자도 여기로 등록할 수 있다 */}
      <div className="mt-3 flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => applyPreset(preset)}
            className="h-11 rounded-pill border border-line bg-surface px-3.5 text-[13px] font-medium text-body transition-transform duration-100 ease-out active:scale-[0.97] active:border-brand active:text-brand"
          >
            {preset.label}
          </button>
        ))}
        <button
          type="button"
          onClick={clearAll}
          className="h-11 rounded-pill border border-line bg-surface px-3.5 text-[13px] font-medium text-muted transition-transform duration-100 ease-out active:scale-[0.97]"
        >
          전체 해제
        </button>
      </div>

      <p className="tabular mt-3 text-[13px] text-faint" aria-live="polite">
        {selected.size === 0 ? '아직 선택한 시간이 없어요' : `총 ${hours}시간 선택`}
      </p>

      {isLoading ? (
        <GridSkeleton />
      ) : (
        <AvailabilityGrid className="mt-2" selected={selected} onChange={setSelected} />
      )}

      {mergedDays.length > 0 && (
        <p className="mt-3 text-[12px] leading-[1.5] text-muted">
          {mergedDays.join('·')}요일은 요일당 한 구간만 저장돼요. 중간에 비워 둔 시간도 포함해
          저장됩니다.
        </p>
      )}

      <p className="mt-3 text-[12px] leading-[1.5] text-faint">
        09시~23시만 표시합니다. 새벽 근무 공고는 홈에서 “전체 보기”로 볼 수 있어요.
      </p>

      {/* 하단 고정 저장 바 — 480px 컨테이너를 벗어나므로 중앙 정렬을 직접 건다 */}
      <div
        className="fixed bottom-0 left-1/2 z-30 w-full max-w-[480px] -translate-x-1/2 border-t border-line bg-surface px-4 pt-3"
        style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}
      >
        <Button size="lg" fullWidth loading={isSaving} onClick={handleSave}>
          저장
        </Button>
      </div>
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="mt-2" role="status" aria-label="가능한 시간을 불러오는 중">
      <Skeleton className="h-9 w-full" />
      <Skeleton className="mt-2 h-[560px] w-full" />
    </div>
  );
}

export default AvailabilityPage;
