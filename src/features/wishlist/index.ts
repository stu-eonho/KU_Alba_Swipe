/**
 * OWNER: 개발자 B (screen-composer)
 *
 * 찜 화면 배럴. deck-interaction은 여기서 GridCard/BackFace/gridCardLayoutId를 가져다
 * 확대·뒤집기 컨테이너를 붙이면 된다.
 */
export { GridCard, gridCardLayoutId } from './GridCard';
export type { GridCardProps } from './GridCard';

export { WishlistGrid } from './WishlistGrid';
export type { WishlistGridProps } from './WishlistGrid';

export { BackFace } from './BackFace';
export type { BackFaceProps } from './BackFace';

export { ExpandedCard } from './ExpandedCard';
export type { ExpandedCardProps } from './ExpandedCard';

export {
  FLIP_MS,
  FLIP_EASE,
  FLIP_ENABLED,
  FLIP_TRANSITION,
  INSTANT_TRANSITION,
  BACKDROP_MS,
  PERSPECTIVE_PX,
} from './flipMotion';

export {
  WishlistEmpty,
  DeckExhaustedEmpty,
  LoadErrorState,
  NotFoundState,
  WishlistGridSkeleton,
  DeckCardSkeleton,
} from './emptyStates';

export { JobThumb, formatWage, formatSchedule, jobAriaLabel, categoryGradient } from './jobPresentation';


