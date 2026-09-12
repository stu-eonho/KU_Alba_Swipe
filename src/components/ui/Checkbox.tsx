/**
 * OWNER: 개발자 B (ui-foundation) — 단독 소유
 *
 * 개인정보 활용 동의 등 폼 체크박스. 회원가입 3단계에서 쓴다.
 *
 * Blind 레퍼런스(DESIGN_Swipe.md) 톤:
 *  - 박스 20px, rounded-chip(4px), 미체크 1px border-line + bg-surface
 *  - 체크 시 bg-brand + 흰 Check 14px
 *  - 그림자 없음. 강조는 최대 600까지 — 700·800 굵기는 쓰지 않는다
 *  - 피드백 전환 120ms, --ease-standard
 *
 * 접근성:
 *  네이티브 <input type="checkbox">를 sr-only로 두고 시각 박스를 옆에 그린다.
 *  → Space 토글·폼 제출·스크린리더가 전부 공짜로 따라온다.
 *  포커스 링은 peer-focus-visible로 시각 박스에 옮겨 그린다 (전역 :focus-visible과 같은 모양).
 *
 * 터치 타겟: 라벨 행 전체가 클릭 영역이며 min-height 44px을 보장한다.
 *  (박스에 .touch-44를 붙이지 않은 이유는 _workspace/04 문서 4절 참조)
 */
import { useId } from 'react';
import clsx from 'clsx';
import { Check } from 'lucide-react';
import { RequiredMark } from './RequiredMark';

export type CheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** 링크가 섞일 수 있어 ReactNode */
  label: React.ReactNode;
  /** true면 라벨 뒤에 접근 가능한 별표 표시 */
  required?: boolean;
  /** 라벨 아래 12px faint 보조 설명 */
  description?: string;
  disabled?: boolean;
  /** 미체크 상태로 제출 시도 시 등. 있으면 박스 보더도 error 색이 된다 */
  error?: string;
  className?: string;
};

export function Checkbox({
  checked,
  onChange,
  label,
  required = false,
  description,
  disabled = false,
  error,
  className,
}: CheckboxProps) {
  const id = useId();
  const descId = `${id}-desc`;
  const errId = `${id}-err`;
  const hasError = Boolean(error);

  const describedBy =
    [description ? descId : null, hasError ? errId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className={clsx('w-full', className)}>
      <label
        htmlFor={id}
        className={clsx(
          'flex min-h-11 items-start gap-2.5 py-2 select-none',
          disabled ? 'cursor-not-allowed' : 'cursor-pointer',
        )}
      >
        <input
          id={id}
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          disabled={disabled}
          required={required}
          aria-required={required || undefined}
          aria-invalid={hasError || undefined}
          aria-describedby={describedBy}
          onChange={(e) => onChange(e.target.checked)}
        />
        {/* 시각 박스 — 실제 포커스는 위 input이 갖고, 링만 여기에 그린다 */}
        <span
          aria-hidden
          className={clsx(
            'rounded-chip mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border',
            'ease-standard transition-colors duration-[120ms]',
            'peer-focus-visible:outline-brand peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2',
            checked
              ? 'bg-brand border-brand text-white'
              : clsx('bg-surface', hasError ? 'border-error' : 'border-line'),
            disabled && 'opacity-50',
          )}
        >
          {checked && <Check size={14} strokeWidth={2.5} />}
        </span>

        <span
          className={clsx(
            'min-w-0 flex-1 text-[14px] leading-[1.5]',
            disabled ? 'text-faint' : 'text-ink',
          )}
        >
          {label}
          {required && <RequiredMark />}
          {description && (
            <span id={descId} className="text-faint mt-1 block text-[12px] leading-[1.45]">
              {description}
            </span>
          )}
        </span>
      </label>

      {hasError && (
        <p id={errId} className="text-error mt-1.5 text-[13px] leading-[1.45]">
          {error}
        </p>
      )}
    </div>
  );
}
