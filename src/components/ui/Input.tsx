/**
 * OWNER: 개발자 B (ui-foundation) — 단독 소유
 *
 * ALBASWIPE_SPEC.md <component_styling><inputs>
 *  - 높이 52px, radius 12px, 보더 1px line, padding 좌우 16px
 *  - 폰트 16px (CRITICAL: 미만이면 iOS Safari가 화면을 자동 확대한다)
 *  - focus: 보더 brand + ring 3px brand/15
 *  - error: 보더 nope, 필드 하단 6px에 13px nope 메시지
 *
 * 라벨/에러 슬롯 내장. 개발자 A의 로그인·회원가입 폼이 이걸 그대로 쓴다.
 */
import { useId } from 'react';
import clsx from 'clsx';

export type InputProps = {
  label?: string;
  /** 있으면 에러 상태로 렌더되고 필드 하단에 표시된다 */
  error?: string;
  /** 에러가 없을 때만 표시되는 보조 문구 */
  hint?: string;
  /** 바깥 래퍼 클래스 (폭 조절 등) */
  containerClassName?: string;
} & React.InputHTMLAttributes<HTMLInputElement>;

export function Input({
  label,
  error,
  hint,
  containerClassName,
  className,
  id,
  ...rest
}: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const msgId = `${inputId}-msg`;
  const hasError = Boolean(error);

  return (
    <div className={clsx('w-full', containerClassName)}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-muted mb-1.5 block text-[14px] leading-[1.4] font-semibold"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        aria-invalid={hasError || undefined}
        aria-describedby={error || hint ? msgId : undefined}
        className={clsx(
          // 16px 하한 — 낮추지 말 것
          'text-ink placeholder:text-faint h-[52px] w-full px-4 text-[16px]',
          'rounded-field bg-surface border transition-colors',
          'focus:ring-brand/15 focus:ring-[3px] focus:outline-none',
          'disabled:bg-subtle disabled:text-faint',
          hasError ? 'border-nope focus:border-nope' : 'border-line focus:border-brand',
          className,
        )}
        {...rest}
      />
      {(error || hint) && (
        <p
          id={msgId}
          className={clsx(
            'mt-1.5 text-[13px] leading-[1.45]',
            hasError ? 'text-nope' : 'text-faint',
          )}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

export type TextareaProps = {
  label?: string;
  error?: string;
  hint?: string;
  containerClassName?: string;
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>;

/**
 * <apply_view><form>: 최소 높이 140px, resize vertical, padding 12px 16px, 폰트 16px.
 * Input과 같은 파일에 둔다 — 스타일이 한 벌이어야 어긋나지 않는다.
 */
export function Textarea({
  label,
  error,
  hint,
  containerClassName,
  className,
  id,
  ...rest
}: TextareaProps) {
  const autoId = useId();
  const areaId = id ?? autoId;
  const msgId = `${areaId}-msg`;
  const hasError = Boolean(error);

  return (
    <div className={clsx('w-full', containerClassName)}>
      {label && (
        <label
          htmlFor={areaId}
          className="text-muted mb-1.5 block text-[14px] leading-[1.4] font-semibold"
        >
          {label}
        </label>
      )}
      <textarea
        id={areaId}
        aria-invalid={hasError || undefined}
        aria-describedby={error || hint ? msgId : undefined}
        className={clsx(
          'text-ink placeholder:text-faint min-h-[140px] w-full resize-y px-4 py-3 text-[16px]',
          'rounded-field bg-surface border leading-[1.55] transition-colors',
          'focus:ring-brand/15 focus:ring-[3px] focus:outline-none',
          hasError ? 'border-nope focus:border-nope' : 'border-line focus:border-brand',
          className,
        )}
        {...rest}
      />
      {(error || hint) && (
        <p
          id={msgId}
          className={clsx(
            'mt-1.5 text-[13px] leading-[1.45]',
            hasError ? 'text-nope' : 'text-faint',
          )}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
