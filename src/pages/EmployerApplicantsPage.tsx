import { useCallback, useState } from 'react';
import { Inbox, WifiOff } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { EmptyState, Skeleton } from '@/components/ui';
import { ApplicantCard, ApplicantDetail } from '@/features/employer-ui';
import { useEmployerApplicants } from '@/hooks/useEmployerApplicants';
import type { ApplicantEntry, ApplicationStatus } from '@/types';

export default function EmployerApplicantsPage() {
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
        description="지원서가 들어오면 이곳에서 프로필을 확인하고 채용할 수 있어요"
        actionLabel="새로고침"
        actionVariant="secondary"
        onAction={() => void retry()}
      />
    );
  }

  return (
    <>
      <ul aria-label="지원자 목록" className="border-line-soft border-t">
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
