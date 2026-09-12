/**
 * OWNER: 개발자 B (ui-foundation) — 단독 소유
 *
 * 공유 프리미티브 배럴. 개발자 A는 "@/components/ui"에서만 가져오고
 * 자체 Button/Input을 만들지 않습니다. 프리미티브가 두 벌이면 화면이 어긋납니다.
 *
 * 필요한 프리미티브가 없으면 직접 만들지 말고 B에게 요청하세요.
 */
export { Button } from './Button';
export type { ButtonProps } from './Button';

export { IconButton } from './IconButton';
export type { IconButtonProps } from './IconButton';

export { Input, Textarea } from './Input';
export type { InputProps, TextareaProps } from './Input';

export { Checkbox } from './Checkbox';
export type { CheckboxProps } from './Checkbox';

export { StepProgress } from './StepProgress';
export type { StepProgressProps } from './StepProgress';

export { Chip } from './Chip';
export type { ChipProps } from './Chip';

export { Badge } from './Badge';
export type { BadgeProps } from './Badge';

export { EmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';

export { Skeleton } from './Skeleton';
export type { SkeletonProps } from './Skeleton';

export { Spinner, FullScreenSpinner } from './Spinner';
export type { SpinnerProps } from './Spinner';

export { ToastProvider, useToast } from './Toast';
export type { ToastApi, ToastOptions, ToastVariant } from './Toast';

export { ConfirmDialog } from './ConfirmDialog';
export type { ConfirmDialogProps } from './ConfirmDialog';
