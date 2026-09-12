/**
 * 구인자 지원자 화면.
 *
 * 두 가지 보기를 같은 데이터 위에 올린다.
 *  - 스와이프(기본): 사용자가 요청한 기능. `<ApplicantDeck>` + `useApplicantDeck()`.
 *  - 리스트: 기존 화면 그대로. 상세 시트·상태 변경이 여기에만 있어 지우지 않는다.
 *
 * 토글은 세그먼트 컨트롤 하나. 탭바가 이미 아래에 있어 또 다른 탭처럼 보이면 안 되므로
 * 라벨 2개짜리 작은 스위치로 두고, 선택 표시는 면(bg-surface)으로만 한다 — 그림자 없음,
 * 레드는 CTA 전용이라 쓰지 않는다.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Inbox, WifiOff } from 'lucide-react';
import clsx from 'clsx';
import { useSearchParams } from 'react-router-dom';
import { EmptyState, Skeleton } from '@/components/ui';
import { ApplicantCard, ApplicantDetail } from '@/features/employer-ui';
import { ApplicantDeck } from '@/features/employer-deck';
import {
  TUTORIAL_ACTIVE_EVENT,
  isTutorialActive,
  type TutorialActiveDetail,
} from '@/features/onboarding';
import {
  EMPLOYER_TUTORIAL_SEEKER_ID,
  createEmployerTutorialApplicant,
} from '@/features/onboarding/employerTutorialApplicant';
import { useApplicantDeck } from '@/hooks/useApplicantDeck';
import { useEmployerApplicants } from '@/hooks/useEmployerApplicants';
import type { ApplicantEntry, ApplicationStatus } from '@/types';

type ViewMode = 'swipe' | 'list';

export default function EmployerApplicantsPage() {
  // 사용자가 원한 기능이 스와이프이므로 기본값은 스와이프다.
  const [mode, setMode] = useState<ViewMode>('swipe');

  return (
    <div className="flex flex-col">
      <ViewModeToggle mode={mode} onChange={setMode} />
      {mode === 'swipe' ? <SwipeView /> : <ListView />}
    </div>
  );
}

/** 리스트 / 스와이프 전환. 44px 높이 → 두 버튼 모두 터치 타겟 하한을 자체 충족한다 */
function ViewModeToggle({
  mode,
  onChange,
}: {
  mode: ViewMode;
  onChange: (next: ViewMode) => void;
}) {
  const options: { value: ViewMode; label: string }[] = [
    { value: 'swipe', label: '스와이프' },
    { value: 'list', label: '리스트' },
  ];

  return (
    <div className="px-4 pt-3 pb-1">
      <div
        role="group"
        aria-label="지원자 보기 방식"
        className="bg-subtle flex h-11 items-center gap-1 rounded-full p-1"
      >
        {options.map((option) => {
          const selected = mode === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={clsx(
                'h-9 flex-1 rounded-full text-[13px] leading-[1.3] font-semibold',
                'transition-transform duration-100 ease-out active:scale-[0.97]',
                selected ? 'bg-surface text-ink' : 'text-muted',
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** 스와이프 보기 — 아직 판단하지 않은 지원자만 올라온다. 빈 상태는 ApplicantDeck이 갖고 있다 */
function SwipeView() {
  const { applicants, isLoading, isError, retry, offer } = useApplicantDeck();
  const [tutorialActive, setTutorialActive] = useState(() => isTutorialActive());
  const [sampleDismissed, setSampleDismissed] = useState(false);
  const tutorialApplicant = useMemo(() => createEmployerTutorialApplicant(), []);

  useEffect(() => {
    const handleTutorialActive = (event: Event) => {
      const active = (event as CustomEvent<TutorialActiveDetail>).detail?.active === true;
      setTutorialActive(active);
      if (active) setSampleDismissed(false);
    };
    window.addEventListener(TUTORIAL_ACTIVE_EVENT, handleTutorialActive);
    return () => window.removeEventListener(TUTORIAL_ACTIVE_EVENT, handleTutorialActive);
  }, []);

  const showTutorialApplicant = tutorialActive && !sampleDismissed;
  const deckEntries = showTutorialApplicant ? [tutorialApplicant, ...applicants] : applicants;

  const handleDecide = useCallback(
    (seekerId: string, direction: 'left' | 'right', jobId: string) => {
      if (seekerId === EMPLOYER_TUTORIAL_SEEKER_ID) {
        // 가상 카드는 화면에서만 제거한다. DB offer와 알림은 만들지 않는다.
        setSampleDismissed(true);
        return;
      }
      offer(seekerId, direction, jobId);
    },
    [offer],
  );

  if (isLoading && !showTutorialApplicant) {
    return (
      <div className="flex flex-col items-center" role="status" aria-label="지원자를 불러오는 중">
        <div className="mx-auto mt-4 w-[calc(100%-32px)] max-w-[448px]">
          <Skeleton variant="card" />
        </div>
      </div>
    );
  }

  if (isError && !showTutorialApplicant) {
    return (
      <EmptyState
        icon={<WifiOff size={48} className="text-faint" aria-hidden />}
        title="지원자를 불러오지 못했어요"
        description="네트워크 상태를 확인하고 다시 시도해 주세요"
        actionLabel="다시 시도"
        actionVariant="secondary"
        onAction={() => void retry()}
      />
    );
  }

  return (
    <ApplicantDeck entries={deckEntries} onDecide={handleDecide} tutorialMode={tutorialActive} />
  );
}

/** 기존 리스트 보기. 상세 시트와 상태 변경은 여기에만 있다 */
function ListView() {
  const { applications, isLoading, isError, retry, setStatus } = useEmployerApplicants();
  const [searchParams, setSearchParams] = useSearchParams();
  const [manualSelectedId, setManualSelectedId] = useState<string | null>(null);
  const requestedId = searchParams.get('applicationId');
  const selectedId =
    manualSelectedId ??
    (requestedId && applications.some((entry) => entry.id === requestedId) ? requestedId : null);
  const selected = applications.find((entry) => entry.id === selectedId) ?? null;

  const handleViewed = useCallback(
    (applicationId: string) => setStatus(applicationId, 'viewed'),
    [setStatus],
  );

  const handleSetStatus = (applicationId: string, status: ApplicationStatus) => {
    setStatus(applicationId, status);
  };
  const handleClose = useCallback(() => {
    setManualSelectedId(null);
    if (searchParams.has('applicationId')) {
      const next = new URLSearchParams(searchParams);
      next.delete('applicationId');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  if (isLoading) {
    return (
      <div className="p-4" role="status" aria-label="지원자를 불러오는 중">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="mb-2 h-[76px]" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        icon={<WifiOff size={48} className="text-faint" aria-hidden />}
        title="지원자를 불러오지 못했어요"
        description="네트워크 상태를 확인하고 다시 시도해 주세요"
        actionLabel="다시 시도"
        actionVariant="secondary"
        onAction={() => void retry()}
      />
    );
  }

  if (applications.length === 0) {
    return (
      <EmptyState
        icon={<Inbox size={52} className="text-faint" aria-hidden />}
        title="아직 지원자가 없어요"
        description="지원서가 들어오면 이곳에서 프로필을 확인하고 관심을 보낼 수 있어요"
        actionLabel="새로고침"
        actionVariant="secondary"
        onAction={() => void retry()}
      />
    );
  }

  return (
    <>
      <ul aria-label="지원자 목록" className="flex flex-col gap-2 px-3 py-3">
        {applications.map((entry: ApplicantEntry) => (
          <li key={entry.id}>
            <ApplicantCard
              entry={entry}
              onOpen={(next) => setManualSelectedId(next.id)}
              onViewed={handleViewed}
            />
          </li>
        ))}
      </ul>
      <ApplicantDetail entry={selected} onClose={handleClose} onSetStatus={handleSetStatus} />
    </>
  );
}
