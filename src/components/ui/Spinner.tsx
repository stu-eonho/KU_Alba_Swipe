/**
 * OWNER: 개발자 B (ui-foundation) — 단독 소유
 *
 * ALBASWIPE_SPEC.md <animations><loading>: 16px 2px stroke, 700ms 회전.
 * 색은 currentColor를 따른다 — 버튼 안에서는 버튼 텍스트 색, 전체 화면에서는 brand.
 */
import clsx from 'clsx';

export type SpinnerProps = {
  /** 픽셀. 버튼 내부 16 / 전체 화면 32 */
  size?: number;
  /** 스크린리더 문구 */
  label?: string;
  className?: string;
};

export function Spinner({ size = 16, label = '불러오는 중', className }: SpinnerProps) {
  const borderWidth = size >= 32 ? 3 : 2;
  return (
    <span
      role="status"
      aria-label={label}
      className={clsx('inline-block animate-spin rounded-full align-middle', className)}
      style={{
        width: size,
        height: size,
        borderWidth,
        borderStyle: 'solid',
        borderColor: 'currentColor',
        borderTopColor: 'transparent',
        animationDuration: '700ms',
      }}
    />
  );
}

/** 라우터 가드·초기 로딩용 전체 화면 스피너 (32px, brand) */
export function FullScreenSpinner({ label = '불러오는 중' }: { label?: string }) {
  return (
    <div className="text-brand grid min-h-[100dvh] w-full place-items-center">
      <Spinner size={32} label={label} />
    </div>
  );
}
