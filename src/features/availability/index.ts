/**
 * OWNER: 개발자 B (deck-interaction) — 단독 소유
 *
 * 라우터 연결 예시 (router.tsx 담당자용):
 *   import { AvailabilityPage } from '@/features/availability';
 *   { path: '/settings/availability', element: <AvailabilityPage />,
 *     handle: { title: '가능한 시간' } }   // SettingsFullscreenLayout backTo="/settings"
 */
export { AvailabilityGrid } from './AvailabilityGrid';
export type { AvailabilityGridProps } from './AvailabilityGrid';

export { AvailabilityPage } from './AvailabilityPage';

export {
  availabilityToCells,
  cellsToAvailability,
  cellsToSegments,
  cellsToHours,
  GRID_DAYS,
  GRID_START_MIN,
  GRID_END_MIN,
  ROW_COUNT,
  SLOT_MINUTES,
} from './gridModel';
export type { CellKey } from './gridModel';
