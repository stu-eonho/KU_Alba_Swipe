/**
 * OWNER: 개발자 B (ui-foundation) — 단독 소유
 *
 * ALBASWIPE_SPEC.md <component_styling><buttons> 그대로 이식.
 *  - primary   : bg-brand / 흰 텍스트
 *  - secondary : 흰 배경 + 1.5px brand 보더 + brand 텍스트
 *  - ghost     : 투명 배경 + muted 텍스트
 *  - size md 44px / lg 52px, radius 12px, 14px/600
 *  - disabled  : bg-line / text-faint
 *  - pressed   : scale(0.97) 100ms
 *  - loading   : 텍스트 유지 + 좌측 16px 스피너 (폭 고정 → 레이아웃 점프 없음)
 */
import clsx from 'clsx';
import { Spinner } from './Spinner';

export type ButtonProps = {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

const VARIANT: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-brand text-white active:bg-brand-dark',
  secondary: 'bg-surface text-brand border-[1.5px] border-brand active:bg-brand-soft',
  ghost: 'bg-transparent text-muted active:bg-subtle',
};

// md 44px / lg 52px — 둘 다 터치 타겟 44px 하한을 자체 충족한다
const SIZE: Record<NonNullable<ButtonProps['size']>, string> = {
  md: 'h-11 px-4 rounded-field',
  lg: 'h-[52px] px-5 rounded-field',
};

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={clsx(
        'inline-flex items-center justify-center gap-1.5 text-[14px] leading-[1.4] font-semibold',
        'transition-transform duration-100 ease-out select-none',
        'active:scale-[0.97]',
        'disabled:pointer-events-none disabled:border-transparent disabled:bg-line disabled:text-faint',
        VARIANT[variant],
        SIZE[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading && <Spinner size={16} className="shrink-0" label="처리 중" />}
      <span className="truncate">{children}</span>
    </button>
  );
}
