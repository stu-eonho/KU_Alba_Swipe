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
  cellsToHours,
  cellsToSegments,
  columnKeys,
  type CellKey,
} from './gridModel';

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

  /** 7일 09~23시를 전부 켠다. 이미 전부 켜져 있으면 아무것도 하지 않는다. */
  const selectAll = useCallback(() => {
    setSelected(() => {
      const next = new Set<CellKey>();
      for (let col = 0; col < COL_COUNT; col += 1) {
        for (const key of columnKeys(col)) next.add(key);
      }
      return next;
    });
  }, []);

  const clearAll = useCallback(() => setSelected(new Set()), []);

  // 떨어진 구간을 그대로 보낸다. 감싸지 않는다 — schema_phase5_availability.sql 로
  // 기본키에 start_min 이 들어가 같은 요일 여러 줄이 저장된다.
  const list = useMemo(() => cellsToSegments(selected), [selected]);
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

      {/* 전체 선택 / 전체 해제 — 드래그가 어려운 사람과 키보드 사용자의 진입점 */}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={selectAll}
          className="h-11 rounded-pill border border-line bg-surface px-3.5 text-[13px] font-medium text-body transition-transform duration-100 ease-out active:scale-[0.97] active:border-brand active:text-brand"
        >
          전체 선택
        </button>
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
