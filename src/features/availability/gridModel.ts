/**
 * OWNER: 개발자 B (deck-interaction) — 단독 소유
 *
 * when2meet 격자의 "셀 집합" ↔ `Availability[]` 변환. 순수 함수만 있습니다.
 * React 도 네트워크도 없으니 콘솔에서 그대로 돌려볼 수 있습니다.
 *
 * 격자는 09:00~23:00 을 30분 단위로 자른 28행 × 7요일입니다.
 * 24시간으로 하면 모바일 한 화면에 들어가지 않아 잘랐습니다. 새벽 공고는
 * 홈의 "전체 보기"로 봅니다.
 */
import { WEEKDAYS } from '@/types';
import type { Availability, Weekday } from '@/types';

/* ------------------------------------------------------------------ */
/* 격자 상수 — 화면과 변환이 같은 값을 보게 여기 한 곳에 모읍니다        */
/* ------------------------------------------------------------------ */

export const GRID_START_HOUR = 9;
export const GRID_END_HOUR = 23;
/** 한 칸이 덮는 분 */
export const SLOT_MINUTES = 30;
/** 540 */
export const GRID_START_MIN = GRID_START_HOUR * 60;
/** 1380 */
export const GRID_END_MIN = GRID_END_HOUR * 60;
/** 28 */
export const ROW_COUNT = (GRID_END_MIN - GRID_START_MIN) / SLOT_MINUTES;
/** 월·화·수·목·금·토·일 순서. 열 인덱스가 곧 이 배열의 인덱스입니다. */
export const GRID_DAYS: readonly Weekday[] = WEEKDAYS;
export const COL_COUNT = GRID_DAYS.length;
/** 셀 높이(px). 28행 × 20px = 560px */
export const CELL_HEIGHT_PX = 20;
/** 좌측 시간 라벨 열 폭(px) */
export const TIME_COL_WIDTH_PX = 40;
/** 시간 라벨은 2시간마다만 — 30분 4칸 = 2시간 */
export const LABEL_EVERY_ROWS = 4;

/** `"${열}-${행}"`. Set<string> 으로 다루려고 문자열 키를 씁니다. */
export type CellKey = string;

export function cellKey(col: number, row: number): CellKey {
  return `${col}-${row}`;
}

/** 키에서 열 인덱스만 꺼냅니다. 프리셋이 "선택된 요일"을 셀 때 씁니다. */
export function colOfKey(key: CellKey): number {
  return Number(key.slice(0, key.indexOf('-')));
}

/** 행 → 그 행이 시작하는 분. row 0 = 540(09:00) */
export function rowStartMin(row: number): number {
  return GRID_START_MIN + row * SLOT_MINUTES;
}

/** 540 → "09:00" */
export function minToHHMM(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/** 시(hour) → 그 시각이 시작하는 행. 프리셋(09-13 등)이 씁니다. */
export function hourToRow(hour: number): number {
  return (hour * 60 - GRID_START_MIN) / SLOT_MINUTES;
}

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/**
 * 두 셀이 만드는 사각 범위의 키들. 드래그가 시작 셀에서 현재 셀까지
 * 직선이 아니라 **사각형**을 칠하는 게 when2meet 의 동작입니다.
 */
export function rectKeys(
  a: { col: number; row: number },
  b: { col: number; row: number },
): CellKey[] {
  const c0 = Math.min(a.col, b.col);
  const c1 = Math.max(a.col, b.col);
  const r0 = Math.min(a.row, b.row);
  const r1 = Math.max(a.row, b.row);

  const keys: CellKey[] = [];
  for (let c = c0; c <= c1; c += 1) {
    for (let r = r0; r <= r1; r += 1) keys.push(cellKey(c, r));
  }
  return keys;
}

/** 한 열(요일) 전체 키. 요일 헤더 탭이 씁니다. */
export function columnKeys(col: number): CellKey[] {
  const keys: CellKey[] = [];
  for (let r = 0; r < ROW_COUNT; r += 1) keys.push(cellKey(col, r));
  return keys;
}

/**
 * 선택된 셀 → 연속 구간. **붙어 있는 슬롯은 하나로 합칩니다.**
 * 09:00~12:00 은 6줄이 아니라 `{ startMin: 540, endMin: 720 }` 한 줄입니다.
 *
 * 한 요일에 떨어진 구간이 여럿이면 여럿 그대로 돌려줍니다(화면 요약용).
 */
export function cellsToSegments(cells: ReadonlySet<CellKey>): Availability[] {
  const out: Availability[] = [];

  for (let col = 0; col < COL_COUNT; col += 1) {
    const rows: number[] = [];
    for (let row = 0; row < ROW_COUNT; row += 1) {
      if (cells.has(cellKey(col, row))) rows.push(row);
    }
    if (rows.length === 0) continue;

    let runStart = rows[0]!;
    let prev = rows[0]!;
    for (let i = 1; i <= rows.length; i += 1) {
      const current = rows[i];
      if (current === prev + 1) {
        prev = current;
        continue;
      }
      out.push({
        day: GRID_DAYS[col]!,
        startMin: rowStartMin(runStart),
        endMin: rowStartMin(prev) + SLOT_MINUTES,
      });
      if (current === undefined) break;
      runStart = current;
      prev = current;
    }
  }

  return out;
}

/**
 * 저장용 목록.
 *
 * `user_availability` 는 (user_id, day) 유니크라 **요일 하나당 구간 하나**만
 * 들어갑니다(`src/lib/api/availability.ts` 의 upsert onConflict). 그래서 한 요일에
 * 떨어진 구간을 여러 개 칠했으면 가장 이른 시작 ~ 가장 늦은 끝으로 감쌉니다.
 * 조용히 감싸면 사용자가 속으니, 감싼 요일을 `mergedDays` 로 같이 돌려줘서
 * 화면이 "중간 빈 시간도 포함돼요"라고 알릴 수 있게 합니다.
 */
export function cellsToAvailability(cells: ReadonlySet<CellKey>): {
  list: Availability[];
  mergedDays: Weekday[];
} {
  const segments = cellsToSegments(cells);
  const byDay = new Map<Weekday, Availability[]>();

  for (const segment of segments) {
    const bucket = byDay.get(segment.day);
    if (bucket) bucket.push(segment);
    else byDay.set(segment.day, [segment]);
  }

  const list: Availability[] = [];
  const mergedDays: Weekday[] = [];

  for (const day of GRID_DAYS) {
    const bucket = byDay.get(day);
    if (!bucket || bucket.length === 0) continue;
    if (bucket.length > 1) mergedDays.push(day);

    list.push({
      day,
      startMin: Math.min(...bucket.map((segment) => segment.startMin)),
      endMin: Math.max(...bucket.map((segment) => segment.endMin)),
    });
  }

  return { list, mergedDays };
}

/**
 * 반대 변환 — 저장돼 있던 값을 격자에 미리 칠해 놓습니다.
 * 격자 밖(새벽 등)은 잘라 냅니다. 자정을 넘기는 구간(22:00~06:00)은
 * 격자 끝(23:00)까지만 칠합니다.
 */
export function availabilityToCells(list: readonly Availability[]): Set<CellKey> {
  const cells = new Set<CellKey>();

  for (const slot of list) {
    const col = GRID_DAYS.indexOf(slot.day);
    if (col < 0) continue;

    const rawEnd = slot.endMin <= slot.startMin ? slot.endMin + 24 * 60 : slot.endMin;
    const start = clamp(slot.startMin, GRID_START_MIN, GRID_END_MIN);
    const end = clamp(rawEnd, GRID_START_MIN, GRID_END_MIN);
    if (end <= start) continue;

    // 시작은 내림 — 09:15 부터면 09:00 칸이 이미 부분적으로 가능한 시간입니다.
    const startRow = Math.floor((start - GRID_START_MIN) / SLOT_MINUTES);
    const endRow = Math.ceil((end - GRID_START_MIN) / SLOT_MINUTES);
    for (let row = startRow; row < endRow && row < ROW_COUNT; row += 1) {
      cells.add(cellKey(col, row));
    }
  }

  return cells;
}

/** 선택한 칸 수 → 시간. 28칸 = 14시간. 요약 문구에 씁니다. */
export function cellsToHours(cells: ReadonlySet<CellKey>): number {
  return (cells.size * SLOT_MINUTES) / 60;
}
