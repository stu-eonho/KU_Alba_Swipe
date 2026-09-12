/**
 * OWNER: 개발자 B (deck-interaction) — 단독 소유
 *
 * when2meet 식 요일 × 시간 드래그 격자.
 *
 *   pointerdown  시작 셀을 기록하고, 그 셀의 현재 상태를 뒤집어 칠하기/지우기 모드를 정한다
 *   pointermove  시작 셀 ~ 현재 셀의 **사각 범위**를 그 모드대로 채운다
 *   pointerup    확정
 *
 * CRITICAL 1: `setPointerCapture` 를 건다. 손가락이 격자 밖으로 나가도 드래그가 끊기지 않는다.
 * CRITICAL 2: 격자 본체에 `touch-action: none`(touch-none). 없으면 드래그할 때 페이지가 같이 스크롤된다.
 * CRITICAL 3: pointermove 마다 setState 하면 196셀이 매 프레임 리렌더돼 끊긴다.
 *             **커서가 다른 셀로 넘어간 순간에만** onChange 를 부른다(드래그 한 번에 최대 196회,
 *             실제로는 수십 회). 셀은 memo 라서 그중 실제로 바뀐 셀만 다시 그린다.
 *
 * 선택 상태는 부모(AvailabilityPage)가 소유한다 — 프리셋 버튼이 같은 집합을 건드려야 해서.
 */
import { memo, useCallback, useRef } from 'react';
import clsx from 'clsx';
import {
  CELL_HEIGHT_PX,
  COL_COUNT,
  GRID_DAYS,
  LABEL_EVERY_ROWS,
  ROW_COUNT,
  TIME_COL_WIDTH_PX,
  cellKey,
  columnKeys,
  minToHHMM,
  rectKeys,
  rowStartMin,
  type CellKey,
} from './gridModel';

export type AvailabilityGridProps = {
  /** 칠해진 셀. `"${열}-${행}"` 키 집합 */
  selected: ReadonlySet<CellKey>;
  /** 변경된 **새** Set 을 돌려준다(제자리 수정하지 않는다 — 리렌더가 안 일어난다) */
  onChange: (next: Set<CellKey>) => void;
  className?: string;
};

type Cell = { col: number; row: number };

type DragState = {
  pointerId: number;
  /** 드래그 시작 시점의 스냅샷. 사각 범위를 매번 여기에 다시 얹는다 */
  base: Set<CellKey>;
  start: Cell;
  last: Cell;
  mode: 'paint' | 'erase';
};

const ROWS = Array.from({ length: ROW_COUNT }, (_, index) => index);

export function AvailabilityGrid({ selected, onChange, className }: AvailabilityGridProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  // 핸들러는 selected 가 바뀔 때 다시 만들어진다. 붙는 곳이 격자 본체 하나뿐이라
  // (셀 196개가 아니라) 비용이 없다.

  /** 좌표 → 셀. 격자 본체의 사각형만 보면 되므로 셀마다 핸들러를 달 필요가 없다 */
  const cellAt = useCallback((clientX: number, clientY: number): Cell | null => {
    const node = bodyRef.current;
    if (!node) return null;

    const rect = node.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;

    const col = Math.floor(((clientX - rect.left) / rect.width) * COL_COUNT);
    const row = Math.floor((clientY - rect.top) / CELL_HEIGHT_PX);

    return {
      col: Math.min(COL_COUNT - 1, Math.max(0, col)),
      row: Math.min(ROW_COUNT - 1, Math.max(0, row)),
    };
  }, []);

  const applyRect = useCallback(
    (drag: DragState, to: Cell) => {
      const next = new Set(drag.base);
      for (const key of rectKeys(drag.start, to)) {
        if (drag.mode === 'paint') next.add(key);
        else next.delete(key);
      }
      onChange(next);
    },
    [onChange],
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0 && event.pointerType === 'mouse') return;

      const cell = cellAt(event.clientX, event.clientY);
      if (!cell) return;

      // 격자 밖으로 손가락이 나가도 move/up 이 계속 이 요소로 온다
      bodyRef.current?.setPointerCapture(event.pointerId);

      const key = cellKey(cell.col, cell.row);
      const drag: DragState = {
        pointerId: event.pointerId,
        base: new Set(selected),
        start: cell,
        last: cell,
        mode: selected.has(key) ? 'erase' : 'paint',
      };
      dragRef.current = drag;
      // 누르는 순간 바로 반영한다 — 움직임 없는 탭이 셀 하나 토글이 되는 이유
      applyRect(drag, cell);
    },
    [applyRect, cellAt, selected],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;

      const cell = cellAt(event.clientX, event.clientY);
      if (!cell) return;
      // 같은 셀 안에서의 움직임은 무시한다. 여기가 성능의 전부다.
      if (cell.col === drag.last.col && cell.row === drag.last.row) return;

      drag.last = cell;
      applyRect(drag, cell);
    },
    [applyRect, cellAt],
  );

  const endDrag = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (bodyRef.current?.hasPointerCapture(event.pointerId)) {
      bodyRef.current.releasePointerCapture(event.pointerId);
    }
  }, []);

  /** 요일 헤더 탭 = 그 요일 전체 토글. 드래그가 어려운 사람의 탈출구 */
  const toggleColumn = useCallback(
    (col: number) => {
      const keys = columnKeys(col);
      const allOn = keys.every((key) => selected.has(key));
      const next = new Set(selected);
      for (const key of keys) {
        if (allOn) next.delete(key);
        else next.add(key);
      }
      onChange(next);
    },
    [onChange, selected],
  );

  return (
    <div className={clsx('select-none', className)}>
      <div role="grid" aria-label="요일별 가능한 시간" aria-rowcount={ROW_COUNT}>
        {/* 요일 헤더 — 스크롤해도 붙어 있어야 어느 요일인지 안 잃는다.
            top-14 는 TopBar 높이 56px(sticky top-0 z-30). 그 아래에 붙는다. */}
        <div role="row" className="sticky top-14 z-10 flex bg-app pb-1">
          <div aria-hidden style={{ width: TIME_COL_WIDTH_PX }} className="shrink-0" />
          {GRID_DAYS.map((day, col) => (
            <button
              key={day}
              type="button"
              role="columnheader"
              onClick={() => toggleColumn(col)}
              aria-label={`${day}요일 전체 선택 또는 해제`}
              className="h-9 flex-1 text-[12px] font-semibold text-muted active:text-brand"
            >
              {day}
            </button>
          ))}
        </div>

        <div className="flex">
          {/* 시간 라벨 — 2시간마다만. 30분마다 찍으면 글자가 겹친다 */}
          <div aria-hidden style={{ width: TIME_COL_WIDTH_PX }} className="shrink-0">
            {ROWS.map((row) => (
              <div key={row} className="relative" style={{ height: CELL_HEIGHT_PX }}>
                {row % LABEL_EVERY_ROWS === 0 && (
                  <span className="tabular absolute top-0 right-1.5 text-[11px] leading-none text-faint">
                    {minToHHMM(rowStartMin(row))}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* 격자 본체. touch-none 이 없으면 드래그가 페이지 스크롤로 새어 나간다 */}
          <div
            ref={bodyRef}
            className="flex-1 touch-none border-t border-l border-line-soft"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            {ROWS.map((row) => (
              <div key={row} role="row" className="flex">
                {GRID_DAYS.map((day, col) => (
                  <GridCell
                    key={day}
                    on={selected.has(cellKey(col, row))}
                    hourEdge={row % 2 === 1}
                    label={`${day}요일 ${minToHHMM(rowStartMin(row))}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * memo 가 핵심이다. 드래그 한 번에 부모가 수십 번 리렌더되지만
 * `on` 이 바뀐 셀만 실제로 다시 그린다.
 */
const GridCell = memo(function GridCell({
  on,
  hourEdge,
  label,
}: {
  on: boolean;
  hourEdge: boolean;
  label: string;
}) {
  return (
    <div
      role="gridcell"
      aria-label={label}
      aria-selected={on}
      style={{ height: CELL_HEIGHT_PX }}
      /*
       * 선택 셀도 테두리는 격자색 그대로 둔다. 예전에는 border 까지 bg 와 같은
       * 브랜드색이라 인접 셀이 하나의 빨간 덩어리로 뭉쳐 어디까지 칠했는지
       * 읽히지 않았다. 채우기는 25% 로 낮춘다 — 흰 배경 위 옅은 분홍이라
       * 오래 봐도 눈이 덜 아프고, 격자선이 위로 또렷하게 남는다.
       * 시간 경계(정시)는 진한 선을 유지해 09:00/10:00 을 세기 쉽게 한다.
       */
      className={clsx(
        'flex-1 border-r border-b',
        on ? 'bg-brand/25' : 'bg-surface',
        hourEdge ? 'border-b-line border-r-line-soft' : 'border-line-soft',
      )}
    />
  );
});
