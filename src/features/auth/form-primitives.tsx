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
/**
 * AuthLayout 은 로고·태그라인을 담고 있어 디자인 시스템 영역이다.
 * Phase 5 에서 B 소유(`src/components/layout/AuthLayout.tsx`)로 옮겼고,
 * 여기서는 재export 만 한다 — A 의 기존 import 경로를 깨뜨리지 않기 위해서다.
 */
export { AuthLayout } from '@/components/layout/AuthLayout';

/**
 * 세션 복구 중에 보여주는 전체 화면 스피너.
 * 여기서 null 을 돌려주면 새로고침할 때마다 흰 화면이 한 번 스칩니다.
 */
export function AuthLoading() {
  return (
    <div
      role="status"
      aria-label="불러오는 중"
      className="flex min-h-dvh items-center justify-center bg-app"
    >
      <span
        aria-hidden
        className="size-8 animate-spin rounded-full border-[3px] border-line border-t-brand"
      />
    </div>
  );
}

/**
 * 진행 표시 (1/3, 2/3, 3/3).
 * B 가 components/ui/StepProgress 를 올리면 이걸 지우고 갈아탑니다.
 */
export function StepProgress({ current, total }: { current: number; total: number }) {
  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[13px] font-semibold text-muted">
          {current} / {total}
        </span>
      </div>
      <div className="flex gap-1.5" role="presentation">
        {Array.from({ length: total }, (_, index) => (
          <span
            key={index}
            className={`h-1 flex-1 rounded-full transition-colors ${
              index < current ? 'bg-brand' : 'bg-line'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

/** 동의 체크박스. B 의 components/ui/Checkbox 가 올라오면 갈아탑니다. */
export function Checkbox({
  checked,
  onChange,
  label,
  description,
  required,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  required?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 py-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        /* size-5 는 손가락으로 누르기엔 작습니다. 라벨 전체가 누르는 영역이라 괜찮습니다. */
        className="mt-0.5 size-5 shrink-0 accent-brand"
      />
      <span className="min-w-0">
        <span className="block text-[15px] text-ink">
          {required ? <span className="font-semibold text-brand">[필수] </span> : '[선택] '}
          {label}
        </span>
        {description && <span className="mt-1 block text-[13px] text-faint">{description}</span>}
      </span>
    </label>
  );
}

/** 두 개 중 하나를 고르는 큰 선택지. 역할 선택에 씁니다. */
export function ChoiceCard({
  selected,
  onSelect,
  title,
  description,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`w-full rounded-field border p-4 text-left transition-colors ${
        selected ? 'border-brand bg-brand-soft' : 'border-line bg-surface'
      }`}
    >
      <span className={`block text-[15px] font-bold ${selected ? 'text-brand' : 'text-ink'}`}>
        {title}
      </span>
      <span className="mt-1 block text-[13px] text-muted">{description}</span>
    </button>
  );
}

/** 글자수 카운터가 달린 여러 줄 입력. 자기소개서에 씁니다. */
export function TextareaField({
  label,
  value,
  onChange,
  maxLength,
  placeholder,
  hint,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  placeholder?: string;
  hint?: string;
  disabled?: boolean;
}) {
  const id = useId();

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold text-muted">
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        /* maxLength 를 넘기는 입력은 잘라서 받습니다. 붙여넣기로 들어오는 경우가 있습니다. */
        onChange={(event) => onChange(event.target.value.slice(0, maxLength))}
        placeholder={placeholder}
        disabled={disabled}
        rows={6}
        className="w-full resize-y rounded-field border border-line bg-surface px-4 py-3 text-[16px] text-ink outline-none placeholder:text-faint focus:border-brand focus:ring-[3px] focus:ring-brand/15 disabled:bg-subtle"
      />
      <div className="mt-1.5 flex items-start justify-between gap-4">
        <span className="text-[12px] text-faint">{hint}</span>
        <span className="tabular shrink-0 text-[12px] text-faint">
          {value.length} / {maxLength}
        </span>
      </div>
    </div>
  );
}
