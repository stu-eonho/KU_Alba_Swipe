/**
 * OWNER: 개발자 A (설정)
 *
 * 설정 화면의 두 확인 창(기록 초기화 / 로그아웃)에 쓰는 다이얼로그입니다.
 * Escape 와 백드롭 탭으로 닫힙니다.
 */
import { useEffect } from 'react';

type ConfirmDialogProps = {
  title: string;
  description: string;
  confirmLabel: string;
  /** 되돌릴 수 없는 동작이면 확인 버튼을 빨강으로 바꿉니다. */
  tone?: 'brand' | 'danger';
  isPending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  tone = 'brand',
  isPending,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-6"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-[320px] rounded-tile bg-surface p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-[16px] font-bold text-ink">{title}</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">{description}</p>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="h-11 flex-1 rounded-field bg-subtle text-[15px] font-semibold text-muted disabled:opacity-60"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className={`h-11 flex-1 rounded-field text-[15px] font-semibold text-white disabled:opacity-60 ${
              tone === 'danger' ? 'bg-nope' : 'bg-brand'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
