import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { Button, Chip, IconButton } from '@/components/ui';
import { ProfileAvatar } from '@/features/profile';
import type { ApplicantEntry, ApplicationStatus, Mbti, PersonalityTrait } from '@/types';
import { APPLICATION_STATUS_LABEL } from './applicationPresentation';
import { SeekerRating } from './SeekerRating';

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function ApplicantDetail({
  entry,
  onClose,
  onSetStatus,
}: {
  entry: ApplicantEntry | null;
  onClose: () => void;
  onSetStatus: (applicationId: string, status: ApplicationStatus) => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const openEntryId = entry?.id ?? null;

  useEffect(() => {
    if (!openEntryId) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!focusables?.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKey, true);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey, true);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [openEntryId, onClose]);

  if (!entry) return null;
  const profile = entry.seeker.profile as
    | (NonNullable<ApplicantEntry['seeker']['profile']> & {
        mbti?: Mbti | null;
        personalityTraits?: PersonalityTrait[];
      })
    | null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="bg-backdrop dialog-backdrop absolute inset-0" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="dialog-panel relative flex max-h-[calc(100dvh-48px)] w-full max-w-[432px] flex-col overflow-hidden rounded-card border border-line-soft bg-surface outline-none"
      >
        <header className="border-line-soft flex min-h-14 items-center gap-3 border-b px-4">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="clamp-1 text-[16px] font-semibold text-ink">
              {entry.seeker.nickname}
            </h2>
            <p className="clamp-1 text-[12px] text-faint">{entry.job.storeName} 지원</p>
          </div>
          <IconButton label="지원자 상세 닫기" onClick={onClose}>
            <X size={22} strokeWidth={1.75} aria-hidden />
          </IconButton>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <div className="flex items-center gap-4">
            <ProfileAvatar
              nickname={entry.seeker.nickname}
              avatarUrl={profile?.avatarUrl}
              size={64}
            />
            <div className="min-w-0">
              <p className="clamp-1 text-[18px] font-semibold text-ink">{entry.seeker.nickname}</p>
              <p className="mt-1 text-[13px] text-muted">
                상태 · {APPLICATION_STATUS_LABEL[entry.status]}
              </p>
            </div>
          </div>

          <section className="border-line-soft mt-5 border-t pt-5">
            <h3 className="text-[14px] font-semibold text-ink">이 지원자 평가하기</h3>
            <SeekerRating seekerId={entry.seeker.id} className="mt-2" />
          </section>

          <DetailSection title="자기소개" text={profile?.intro} empty="작성한 자기소개가 없어요" />
          <DetailSection title="경력" text={profile?.experience} empty="등록한 경력이 없어요" />

          <section className="border-line-soft mt-5 border-t pt-5">
            <h3 className="text-[14px] font-semibold text-ink">MBTI</h3>
            <p className="mt-2 text-[14px] text-body">{profile?.mbti ?? '선택 안 함'}</p>
          </section>

          <section className="border-line-soft mt-5 border-t pt-5">
            <h3 className="text-[14px] font-semibold text-ink">성격 키워드</h3>
            {profile?.personalityTraits?.length ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {profile.personalityTraits.map((trait) => (
                  <Chip key={trait} size="md">
                    {trait}
                  </Chip>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-[14px] text-faint">선택한 성격 키워드가 없어요</p>
            )}
          </section>

          <section className="border-line-soft mt-5 border-t pt-5">
            <h3 className="text-[14px] font-semibold text-ink">관심 직종</h3>
            {profile?.interests.length ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {profile.interests.map((interest) => (
                  <Chip key={interest} size="md">
                    {interest}
                  </Chip>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-[14px] text-faint">선택한 관심 직종이 없어요</p>
            )}
          </section>

          <section className="border-line-soft mt-5 border-t pt-5">
            <h3 className="text-[14px] font-semibold text-ink">희망 시급</h3>
            <p className="tabular mt-2 text-[16px] text-body">
              {profile?.desiredWage !== null && profile?.desiredWage !== undefined
                ? `${profile.desiredWage.toLocaleString('ko-KR')}원`
                : '미입력'}
            </p>
          </section>

          <DetailSection title="지원 메시지" text={entry.message} empty="남긴 메시지가 없어요" />
        </div>

        <footer className="border-line-soft flex gap-2 border-t bg-surface px-4 py-3">
          <Button
            variant="secondary"
            fullWidth
            disabled={entry.status === 'rejected'}
            onClick={() => onSetStatus(entry.id, 'rejected')}
          >
            거절
          </Button>
          <Button
            fullWidth
            disabled={entry.status === 'accepted'}
            onClick={() => onSetStatus(entry.id, 'accepted')}
          >
            채용
          </Button>
        </footer>
      </div>
    </div>
  );
}

function DetailSection({
  title,
  text,
  empty,
}: {
  title: string;
  text?: string | null;
  empty: string;
}) {
  return (
    <section className="border-line-soft mt-5 border-t pt-5">
      <h3 className="text-[14px] font-semibold text-ink">{title}</h3>
      <p className="mt-2 whitespace-pre-wrap text-[14px] leading-[1.6] text-body">
        {text?.trim() || empty}
      </p>
    </section>
  );
}
