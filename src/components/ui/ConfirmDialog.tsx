/**
 * OWNER: 개발자 B (ui-foundation) — 단독 소유
 *
 * 확인 다이얼로그. 설정 화면의 "스와이프 기록 초기화" / "로그아웃"에 쓴다.
 *
 * 치수: 화면 중앙, width calc(100% - 48px) 최대 340px, radius 16px, padding 20px,
 *       백드롭 bg-backdrop, 제목 17px/700, 본문 14px text-muted,
 *       버튼 행 하단 우측 정렬 (취소 ghost + 확인 primary/danger)
 *
 * 접근성: role="dialog" aria-modal, 포커스 트랩, Escape 닫기,
 *         닫힌 뒤 트리거 요소로 포커스 복귀, 열려 있는 동안 body 스크롤 잠금.
 *
 * 제어 컴포넌트다. open을 호출부가 들고 있어야 한다.
 */
import { useCallback, useEffect, useId, useRef } from 'react';
import clsx from 'clsx';
import { Button } from './Button';

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  /** 본문. 줄바꿈은 그대로 살아난다 (white-space: pre-line) */
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 파괴적 액션이면 확인 버튼이 danger(텍스트 nope) 스타일이 된다 */
  destructive?: boolean;
  /** 확인 버튼 스피너 + 두 버튼 비활성화 */
  loading?: boolean;
  onConfirm: () => void;
  /** 취소 버튼 · 백드롭 탭 · Escape 모두 이걸 부른다 */
  onCancel: () => void;
  className?: string;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = '확인',
  cancelLabel = '취소',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
  className,
}: ConfirmDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  // 호출부가 인라인 화살표 함수를 넘겨도 이펙트가 재실행되지 않도록 ref에 담는다
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onCancelRef.current();
        return;
      }
      if (e.key !== 'Tab') return;

      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables || focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    // capture 단계에서 잡아 페이지의 전역 단축키(ArrowLeft/Right 등)보다 먼저 처리한다
    document.addEventListener('keydown', handleKey, true);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKey, true);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  const handleBackdrop = useCallback(() => {
    if (!loading) onCancel();
  }, [loading, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div
        className="bg-backdrop dialog-backdrop absolute inset-0"
        onClick={handleBackdrop}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className={clsx(
          'bg-surface rounded-tile dialog-panel relative w-[calc(100%-48px)] max-w-[340px] p-5',
          className,
        )}
      >
        <h2 id={titleId} className="text-ink text-[16px] leading-[1.4] font-semibold">
          {title}
        </h2>
        {description && (
          <p
            id={descId}
            className="text-muted mt-2 text-[14px] leading-[1.55] whitespace-pre-line"
          >
            {description}
          </p>
        )}
        <div className="mt-5 flex items-center justify-end gap-2">
          <Button
            ref={cancelRef}
            variant="ghost"
            size="md"
            onClick={onCancel}
            disabled={loading}
            className="px-4"
          >
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? 'danger' : 'primary'}
            size="md"
            onClick={onConfirm}
            loading={loading}
            className="px-4"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
