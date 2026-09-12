/**
 * OWNER: 개발자 B (ui-foundation) — 단독 소유
 *
 * ALBASWIPE_SPEC.md <component_styling><skeletons>: 배경 line, subtle shimmer 1.4초 무한.
 * prefers-reduced-motion이면 정적 (globals.css의 `.skeleton` 참조).
 *
 * 2종:
 *  - card : 덱 로딩. aspect 3/4, radius 24px
 *  - grid : 찜 목록 로딩. 2열 × count(기본 4), aspect 3/4, radius 16px
 *  - block: 임의 크기 (className으로 크기를 준다)
 */
import clsx from 'clsx';

export type SkeletonProps = {
  variant?: 'card' | 'grid' | 'block';
  /** grid 변형에서 렌더할 셀 개수. 기본 4 (2x2) */
  count?: number;
  className?: string;
};

export function Skeleton({ variant = 'block', count = 4, className }: SkeletonProps) {
  if (variant === 'card') {
    return (
      <div
        aria-hidden
        className={clsx('skeleton rounded-card aspect-[3/4] w-full', className)}
      />
    );
  }

  if (variant === 'grid') {
    return (
      <div aria-hidden className={clsx('grid grid-cols-2 gap-3', className)}>
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="skeleton rounded-tile aspect-[3/4] w-full" />
        ))}
      </div>
    );
  }

  return <div aria-hidden className={clsx('skeleton rounded-field h-4 w-full', className)} />;
}
