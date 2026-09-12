/**
 * OWNER: 개발자 A (설정)
 *
 * ⚠️ 설정 화면 전용 임시 토스트입니다. 전역 토스트는 개발자 B 영역이라,
 *    B 의 것이 올라오면 이 파일을 지우고 그쪽으로 갈아탑니다.
 *
 * 3초 뒤 스스로 사라지고, 한 번에 하나만 뜹니다(새 토스트가 기존 것을 교체).
 */
import { useCallback, useEffect, useState } from 'react';

export type ToastTone = 'success' | 'error';
type ToastState = { message: string; tone: ToastTone } | null;

export function useToast() {
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const showToast = useCallback((message: string, tone: ToastTone = 'success') => {
    // 같은 문구를 다시 띄워도 타이머가 새로 돌도록 객체를 매번 새로 만듭니다.
    setToast({ message, tone });
  }, []);

  return { toast, showToast };
}

export function Toast({ toast }: { toast: ToastState }) {
  if (!toast) return null;

  return (
    <div
      role="status"
      className={`fixed inset-x-4 z-40 mx-auto flex h-12 max-w-[448px] items-center justify-center rounded-field px-4 text-[14px] font-medium ${
        toast.tone === 'success' ? 'bg-like-bg text-like-deep' : 'bg-nope-bg text-nope'
      }`}
      /* 탭바(64px) 위에 뜨도록. 100vh 를 쓰지 않는 것과 같은 이유로 safe-area 를 더합니다. */
      style={{ bottom: 'calc(80px + env(safe-area-inset-bottom))' }}
    >
      {toast.message}
    </div>
  );
}
