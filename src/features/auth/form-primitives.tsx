/**
 * OWNER: 개발자 A (데이터/인증)
 *
 * ⚠️ 임시 프리미티브입니다. components/ui 는 개발자 B 단독 소유인데 아직 비어 있어서,
 *    로그인/회원가입을 막아 두지 않으려고 A 소유 폴더 안에 최소한으로 만들었습니다.
 *
 * B 의 Button/Input 이 올라오면 이 파일을 지우고 `@/components/ui` 로 바꿉니다.
 * 그때까지도 색은 globals.css 의 토큰만 씁니다 — hex 를 직접 쓰지 않습니다.
 */
import { useId } from 'react';

type FieldProps = {
  label: string;
  type: 'text' | 'email' | 'password';
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  autoComplete?: string;
  placeholder?: string;
  disabled?: boolean;
};

export function Field({
  label,
  type,
  value,
  onChange,
  onBlur,
  error,
  autoComplete,
  placeholder,
  disabled,
}: FieldProps) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold text-muted">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        autoComplete={autoComplete}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        /* text-[16px] 는 취향이 아니라 필수입니다. 16px 미만이면 iOS Safari 가 탭할 때 화면을 확대합니다. */
        className={`h-[52px] w-full rounded-field border bg-surface px-4 text-[16px] text-ink transition-colors outline-none placeholder:text-faint focus:ring-[3px] disabled:bg-subtle ${
          error
            ? 'border-nope focus:border-nope focus:ring-nope/15'
            : 'border-line focus:border-brand focus:ring-brand/15'
        }`}
      />
      {error && (
        <p id={errorId} className="mt-1.5 text-[13px] text-nope">
          {error}
        </p>
      )}
    </div>
  );
}

/** 폼 상단 에러 배너. 특정 필드에 붙일 수 없는 실패(로그인 실패 등)에 씁니다. */
export function FormBanner({ message }: { message: string }) {
  return (
    <p role="alert" className="rounded-lg bg-nope-bg p-3 text-[14px] text-nope">
      {message}
    </p>
  );
}

export function SubmitButton({
  children,
  isPending,
  disabled,
}: {
  children: React.ReactNode;
  isPending?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={isPending || disabled}
      className="flex h-[52px] w-full items-center justify-center gap-2 rounded-field bg-brand text-[16px] font-bold text-white transition-colors active:bg-brand-dark disabled:opacity-60"
    >
      {isPending && (
        <span
          aria-hidden
          className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
        />
      )}
      {children}
    </button>
  );
}

/** 로그인·회원가입이 공유하는 바깥 틀. 로고 + 480px 중앙 정렬. */
export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col justify-center bg-app p-6">
      <h1 className="mb-8 text-[28px] font-extrabold text-brand">AlbaSwipe</h1>
      {children}
    </div>
  );
}
