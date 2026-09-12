/**
 * OWNER: 개발자 B (ui-foundation) — 단독 소유
 *
 * ALBASWIPE_SPEC.md <global_layout><toast> + <error_handling><user_facing><toast>
 *  fixed, bottom calc(80px + env(safe-area-inset-bottom)), 좌우 16px, z-index 60
 *  최소 높이 48px, radius 12px, padding 12px 16px, 14px/500
 *  성공: bg-like-bg / text-like-deep · 에러: bg-nope-bg / text-nope · 3초
 *  CRITICAL: 최대 1개. 새 토스트는 기존 것을 교체한다 (스택하지 않는다).
 *
 * 액션이 있으면(찜 해제 "되돌리기") 자동 소멸이 5초로 늘어난다 —
 * 3초는 문구를 읽고 버튼을 누르기에 짧다.
 *
 * 사용:
 *   const toast = useToast();
 *   toast.success('찜을 해제했어요', { actionLabel: '되돌리기', onAction: () => restore() });
 *   toast.error('저장에 실패했어요');
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';

const DEFAULT_MS = 3000;
/** 액션 버튼이 있을 때의 자동 소멸 시간 */
const ACTION_MS = 5000;
/** 퇴장 애니메이션 길이 — globals.css의 .toast-leave와 맞춰야 한다 */
const LEAVE_MS = 150;

export type ToastVariant = 'success' | 'error';

export type ToastOptions = {
  /** 액션 버튼 문구. 주면 자동 소멸이 5초로 늘어난다. */
  actionLabel?: string;
  /** 액션 버튼 클릭 핸들러. 누르면 토스트는 즉시 닫힌다. */
  onAction?: () => void;
  /** 자동 소멸 시간(ms) 직접 지정. 기본 3000 (액션 있으면 5000) */
  durationMs?: number;
};

type ToastState = {
  id: number;
  message: string;
  variant: ToastVariant;
  actionLabel?: string;
  onAction?: () => void;
};

export type ToastApi = {
  success: (message: string, options?: ToastOptions) => void;
  error: (message: string, options?: ToastOptions) => void;
  show: (message: string, variant: ToastVariant, options?: ToastOptions) => void;
  dismiss: () => void;
};

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) {
    throw new Error('useToast()는 <ToastProvider> 안에서만 쓸 수 있습니다. main.tsx를 확인하세요.');
  }
  return api;
}

const VARIANT: Record<ToastVariant, string> = {
  success: 'bg-like-bg text-like-deep',
  error: 'bg-nope-bg text-nope',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const [leaving, setLeaving] = useState(false);

  const seq = useRef(0);
  const hideTimer = useRef<number | undefined>(undefined);
  const removeTimer = useRef<number | undefined>(undefined);

  const clearTimers = useCallback(() => {
    window.clearTimeout(hideTimer.current);
    window.clearTimeout(removeTimer.current);
    hideTimer.current = undefined;
    removeTimer.current = undefined;
  }, []);

  const dismiss = useCallback(() => {
    clearTimers();
    setLeaving(true);
    removeTimer.current = window.setTimeout(() => {
      setToast(null);
      setLeaving(false);
    }, LEAVE_MS);
  }, [clearTimers]);

  const show = useCallback(
    (message: string, variant: ToastVariant, options?: ToastOptions) => {
      // 최대 1개 — 기존 것을 애니메이션 없이 즉시 교체한다
      clearTimers();
      seq.current += 1;
      setLeaving(false);
      setToast({
        id: seq.current,
        message,
        variant,
        actionLabel: options?.actionLabel,
        onAction: options?.onAction,
      });

      const ms = options?.durationMs ?? (options?.actionLabel ? ACTION_MS : DEFAULT_MS);
      hideTimer.current = window.setTimeout(() => {
        setLeaving(true);
        removeTimer.current = window.setTimeout(() => {
          setToast(null);
          setLeaving(false);
        }, LEAVE_MS);
      }, ms);
    },
    [clearTimers],
  );

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (message, options) => show(message, 'success', options),
      error: (message, options) => show(message, 'error', options),
      dismiss,
    }),
    [show, dismiss],
  );

  useEffect(() => clearTimers, [clearTimers]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast && (
        <div
          // 컨테이너는 클릭을 가로채지 않는다 — 토스트 본체만 pointer-events를 켠다
          className="pointer-events-none fixed inset-x-0 z-[60] mx-auto flex max-w-[480px] justify-center px-4"
          style={{ bottom: 'calc(80px + env(safe-area-inset-bottom))' }}
        >
          <div
            key={toast.id}
            role="status"
            aria-live={toast.variant === 'error' ? 'assertive' : 'polite'}
            className={clsx(
              'rounded-field pointer-events-auto flex w-full items-center gap-3',
              'min-h-12 px-4 py-3 text-[14px] leading-[1.4] font-medium',
              VARIANT[toast.variant],
              leaving ? 'toast-leave' : 'toast-enter',
            )}
          >
            <span className="flex-1">{toast.message}</span>
            {toast.actionLabel && (
              <button
                type="button"
                onClick={() => {
                  toast.onAction?.();
                  dismiss();
                }}
                className="touch-44 shrink-0 px-1 text-[14px] font-semibold underline underline-offset-2 active:opacity-70"
              >
                {toast.actionLabel}
              </button>
            )}
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}
