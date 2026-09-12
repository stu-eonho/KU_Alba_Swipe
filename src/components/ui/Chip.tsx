/**
 * OWNER: 개발자 B (ui-foundation) — 단독 소유
 *
 * ALBASWIPE_SPEC.md <component_styling><chips>
 *  - 높이 22~26px, radius full, padding 좌우 10px, 11~12px/500
 *  - neutral(직종)  : bg-subtle / text-muted
 *  - success(복리후생): bg-like-bg / text-like-deep
 *  - onImage(덱 카드 이미지 위): bg-chip-image / text-ink, 11px/600
 *
 * 읽기 전용 태그다. 클릭 핸들러를 붙이지 않는다 — 필요하면 Button을 쓴다.
 */
import clsx from 'clsx';

export type ChipProps = {
  children: React.ReactNode;
  variant?: 'neutral' | 'success' | 'onImage';
  /** sm = 22px/11px, md = 26px/12px */
  size?: 'sm' | 'md';
  className?: string;
};

const VARIANT: Record<NonNullable<ChipProps['variant']>, string> = {
  neutral: 'bg-subtle text-muted font-medium',
  success: 'bg-like-bg text-like-deep font-medium',
  onImage: 'bg-chip-image text-ink font-semibold',
};

const SIZE: Record<NonNullable<ChipProps['size']>, string> = {
  sm: 'h-[22px] text-[11px]',
  md: 'h-[26px] text-[12px]',
};

export function Chip({ children, variant = 'neutral', size = 'sm', className }: ChipProps) {
  return (
    <span
      className={clsx(
        'inline-flex max-w-full items-center rounded-full px-[10px] leading-[1.3] whitespace-nowrap',
        VARIANT[variant],
        SIZE[size],
        className,
      )}
    >
      <span className="truncate">{children}</span>
    </span>
  );
}
