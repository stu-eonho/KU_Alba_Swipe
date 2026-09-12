/**
 * OWNER: 개발자 B (Phase 6)
 *
 * 매칭 성사 시트. "채팅" 자리를 대신한다 — 서로 오른쪽으로 넘겼으면 연락처를 교환한다.
 *
 * 알림 목록에서 type === 'mutual_match' 를 탭하면 열린다.
 * 상대 이메일은 matched_contact RPC 가 돌려주고, 매칭이 풀렸거나 계정이 사라졌으면 null 이다.
 *
 * 구조·접근성은 ConfirmDialog 를 따라간다(포커스 트랩 · Escape · 백드롭 탭 닫기 ·
 * body 스크롤 잠금 · 닫은 뒤 트리거로 포커스 복귀). 버튼 구성이 취소/확인이 아니라
 * 복사 + 메일 보내기라 컴포넌트를 따로 뒀다.
 *
 * 레드는 CTA 하나에만 — "메일 보내기"가 유일한 primary 다. "복사"는 ghost.
 */
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Button, Spinner, useToast } from '@/components/ui';
import { useMatchedContact } from '@/hooks/useMatchedContact';

export type MatchSheetProps = {
  open: boolean;
  /** 알림 payload.counterpartId. 없으면 조회를 아예 걸지 않는다. */
  counterpartId: string | null;
  /** 알림의 job.storeName. 공고가 지워졌으면 없을 수 있다. */
  storeName?: string | null;
  onClose: () => void;
};

/**
 * open 게이트만 담당한다. 실제 내용은 MatchPanel 이고, 열릴 때마다 새로 마운트된다 —
 * 그래야 "직접 선택" 같은 지역 상태를 이펙트로 되돌릴 필요가 없다.
 */
export function MatchSheet({ open, ...rest }: MatchSheetProps) {
  if (!open) return null;
  return <MatchPanel {...rest} />;
}

function MatchPanel({ counterpartId, storeName, onClose }: Omit<MatchSheetProps, 'open'>) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const toast = useToast();

  // 클립보드가 막힌 환경(비 HTTPS, 구형 웹뷰)에서는 텍스트를 직접 선택하게 열어준다
  const [selectable, setSelectable] = useState<'email' | 'phone' | null>(null);

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const titleId = useId();
  const descId = useId();

  const { contact, isLoading, isError, retry } = useMatchedContact(counterpartId ?? undefined);
  const email = contact?.email ?? null;
  const phone = contact?.phone ?? null;
  const formattedPhone = formatPhone(phone);
  const name = storeName?.trim() || '상대방';

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onCloseRef.current();
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

    // capture 단계 — 덱의 전역 화살표 단축키보다 먼저 Escape 를 먹는다
    document.addEventListener('keydown', handleKey, true);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKey, true);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  const handleCopy = useCallback(
    async (kind: 'email' | 'phone', value: string) => {
      try {
        if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable');
        await navigator.clipboard.writeText(value);
        toast.success(kind === 'email' ? '이메일을 복사했어요' : '전화번호를 복사했어요');
      } catch {
        setSelectable(kind);
        toast.error('복사할 수 없어요. 연락처를 길게 눌러 직접 복사해 주세요');
      }
    },
    [toast],
  );

  const mailtoHref = email
    ? `mailto:${email}?subject=${encodeURIComponent(`[AlbaSwipe] ${name} 아르바이트 문의`)}`
    : undefined;
  const telHref = phone ? `tel:${phone.replace(/[^0-9+]/g, '')}` : undefined;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div className="bg-backdrop dialog-backdrop absolute inset-0" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="bg-surface rounded-tile dialog-panel relative w-[calc(100%-48px)] max-w-[340px] p-5"
      >
        <div className="flex items-start justify-between gap-2">
          <h2 id={titleId} className="text-ink pt-2 text-[18px] leading-[1.35] font-semibold">
            <span aria-hidden>🎉 </span>매칭됐어요!
          </h2>
          {/* IconButton 은 ref prop 을 노출하지 않는다(B 소유지만 지금 계약을 바꿀 수 없다).
              초기 포커스를 잡아야 해서 여기서만 동일한 스타일의 네이티브 button 을 쓴다. */}
          <button
            ref={closeRef}
            type="button"
            aria-label="닫기"
            onClick={onClose}
            className="text-muted active:bg-subtle -mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full transition-transform duration-100 ease-out select-none active:scale-[0.97]"
          >
            <X size={20} strokeWidth={1.75} aria-hidden />
          </button>
        </div>

        <p id={descId} className="text-muted mt-1 text-[14px] leading-[1.55]">
          {name} 과 서로 관심이 있어요.
        </p>

        <div className="border-line-soft mt-4 border-y py-3">
          {isLoading ? (
            <div className="text-muted flex min-h-11 items-center gap-2">
              <Spinner size={16} label="상대 정보를 불러오는 중" />
              <span className="text-[14px]">연락처를 불러오는 중</span>
            </div>
          ) : isError ? (
            <div className="flex min-h-11 items-center justify-between gap-2">
              <span className="text-muted text-[14px]">연락처를 불러오지 못했어요</span>
              {retry && (
                <Button variant="ghost" size="md" onClick={() => void retry()}>
                  다시 시도
                </Button>
              )}
            </div>
          ) : email || phone ? (
            <div className="flex flex-col gap-1">
              {email && (
                <ContactRow
                  label="이메일"
                  value={email}
                  selectable={selectable === 'email'}
                  onCopy={() => void handleCopy('email', email)}
                />
              )}
              {formattedPhone ? (
                <ContactRow
                  label="전화번호"
                  value={formattedPhone}
                  selectable={selectable === 'phone'}
                  onCopy={() => void handleCopy('phone', phone ?? formattedPhone)}
                />
              ) : (
                <p className="text-faint flex min-h-11 items-center text-[13px]">
                  전화번호가 등록되지 않았어요
                </p>
              )}
            </div>
          ) : (
            <p className="text-muted flex min-h-11 items-center text-[14px] leading-[1.55]">
              상대 정보를 불러올 수 없어요
            </p>
          )}
        </div>

        <div className="mt-5 flex flex-col gap-2">
          {mailtoHref ? (
            <a
              href={mailtoHref}
              onClick={onClose}
              className="bg-brand rounded-field active:bg-brand-dark flex h-11 w-full items-center justify-center text-[14px] leading-[1.4] font-semibold text-white transition-transform duration-100 ease-out select-none active:scale-[0.97]"
            >
              메일 보내기
            </a>
          ) : (
            <Button variant="primary" size="md" fullWidth disabled>
              메일 보내기
            </Button>
          )}
          {telHref && (
            <a
              href={telHref}
              onClick={onClose}
              className="border-brand text-brand rounded-field flex h-11 w-full items-center justify-center border-[1.5px] text-[14px] leading-[1.4] font-semibold transition-transform duration-100 ease-out select-none active:scale-[0.97]"
            >
              전화하기
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function ContactRow({
  label,
  value,
  selectable,
  onCopy,
}: {
  label: string;
  value: string;
  selectable: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="flex min-h-11 items-center gap-2">
      <span className="text-faint w-14 shrink-0 text-[13px]">{label}</span>
      <span
        className={`text-ink min-w-0 flex-1 truncate text-[14px] ${selectable ? 'select-all' : ''}`}
      >
        {value}
      </span>
      <Button variant="ghost" size="md" onClick={onCopy} className="-mr-2 shrink-0 px-3">
        복사
      </Button>
    </div>
  );
}

function formatPhone(value: string | null): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  return value;
}
