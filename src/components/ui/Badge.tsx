/**
 * OWNER: 개발자 B (ui-foundation) — 단독 소유
 *
 * ALBASWIPE_SPEC.md <component_hierarchy><shared>: "Badge — 평점 표시".
 * 높이 22px, radius full.
 *
 * 사용 예 (뒷면 평점 행):
 *   <Badge variant="rating" icon={<Star size={12} className="text-star fill-star" />}>4.6</Badge>
 *
 * count 변형은 탭바 개수 배지와 동일한 모양(brand 원)이며 인라인 배치용이다.
 */
import clsx from 'clsx';

export type BadgeProps = {
  children: React.ReactNode;
  /** 좌측 아이콘. 크기·색은 호출부가 정한다 (예: Star 12px text-star) */
  icon?: React.ReactNode;
  variant?: 'neutral' | 'brand' | 'rating' | 'success' | 'danger';
  className?: string;
};

const VARIANT: Record<NonNullable<BadgeProps['variant']>, string> = {
  neutral: 'bg-subtle text-muted',
  brand: 'bg-brand text-white',
  rating: 'bg-subtle text-ink',
  success: 'bg-like-bg text-like-deep',
  danger: 'bg-nope-bg text-nope',
};

export function Badge({ children, icon, variant = 'neutral', className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'tabular inline-flex h-[22px] items-center gap-1 rounded-full px-2',
        'text-[12px] leading-[1.3] font-semibold whitespace-nowrap',
        VARIANT[variant],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
