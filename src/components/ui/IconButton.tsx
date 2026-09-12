/**
 * OWNER: 개발자 B (ui-foundation) — 단독 소유
 *
 * ALBASWIPE_SPEC.md <component_hierarchy><shared>: 44x44px, aria-label 필수.
 * label prop이 required이므로 aria-label을 빠뜨릴 수 없다.
 *
 * size가 44 미만이어도(격자 카드 찜해제 28px 등) `.touch-44`가 투명 히트 영역으로
 * 44x44px을 보장한다. globals.css 참조.
 *
 * variant:
 *  - plain   : 배경 없음 (탑바 뒤로가기 등)
 *  - surface : 흰 원 + shadow-control (스와이프 컨트롤 64px)
 *  - scrim   : 어두운 반투명 원 + 흰 아이콘 (이미지 위 찜해제)
 *  - brand   : brand 원 + 흰 아이콘
 */
import clsx from 'clsx';

export type IconButtonProps = {
  /** aria-label로 그대로 들어간다. 필수. */
  label: string;
  /** 시각 지름(px). 기본 44. 44 미만이면 투명 패딩으로 터치 타겟을 보정한다. */
  size?: number;
  variant?: 'plain' | 'surface' | 'scrim' | 'brand';
  children: React.ReactNode;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'>;

const VARIANT: Record<NonNullable<IconButtonProps['variant']>, string> = {
  plain: 'bg-transparent text-muted active:bg-subtle',
  surface: 'bg-surface shadow-control text-ink',
  scrim: 'bg-scrim text-white',
  brand: 'bg-brand text-white active:bg-brand-dark',
};

export function IconButton({
  label,
  size = 44,
  variant = 'plain',
  className,
  children,
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={clsx(
        'touch-44 inline-flex shrink-0 items-center justify-center rounded-full',
        'transition-transform duration-100 ease-out select-none active:scale-[0.97]',
        'disabled:pointer-events-none disabled:bg-line disabled:text-faint',
        VARIANT[variant],
        className,
      )}
      style={{ width: size, height: size }}
      {...rest}
    >
      {children}
    </button>
  );
}
