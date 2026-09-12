/**
 * OWNER: 개발자 B (ui-foundation) — 단독 소유
 *
 * ALBASWIPE_SPEC.md: 아이콘 + 제목 + 설명 + CTA.
 *  제목 18px/700 ink · 설명 14px muted · 아이콘 56px(빈 상태) / 48px(에러 상태)
 *
 * 아이콘은 호출부가 크기·색까지 정해서 넘긴다:
 *   <EmptyState icon={<SearchX size={56} className="text-faint" />} ... />
 *
 * CTA는 actionTo(라우터 이동) 또는 onAction(핸들러) 중 하나를 준다.
 */
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { Button } from './Button';

export type EmptyStateProps = {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  /** CTA 버튼 문구. 없으면 버튼을 렌더하지 않는다 */
  actionLabel?: string;
  /** 라우터 경로. 주어지면 Link로 감싼다 */
  actionTo?: string;
  /** 클릭 핸들러. actionTo가 없을 때 쓴다 */
  onAction?: () => void;
  actionVariant?: 'primary' | 'secondary' | 'ghost';
  className?: string;
};

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionTo,
  onAction,
  actionVariant = 'primary',
  className,
}: EmptyStateProps) {
  const button = actionLabel ? (
    <Button variant={actionVariant} size="md" onClick={onAction} className="mt-6 px-6">
      {actionLabel}
    </Button>
  ) : null;

  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center px-6 py-12 text-center',
        className,
      )}
    >
      {icon && <div className="mb-4 flex items-center justify-center">{icon}</div>}
      <h2 className="text-ink text-[18px] leading-[1.4] font-bold">{title}</h2>
      {description && (
        <p className="text-muted mt-2 max-w-[280px] text-[14px] leading-[1.55]">{description}</p>
      )}
      {button && actionTo ? <Link to={actionTo}>{button}</Link> : button}
    </div>
  );
}
