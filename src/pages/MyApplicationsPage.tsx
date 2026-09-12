import { ChevronRight, ClipboardList, WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge, EmptyState, Skeleton } from '@/components/ui';
import {
  MY_APPLICATION_STATUS_LABEL,
  applicationBarClass,
  applicationBadgeVariant,
  formatApplicationDate,
} from '@/features/apply/applicationPresentation';
import { useMyApplications } from '@/hooks/useApply';

export default function MyApplicationsPage() {
  const { applications, isLoading, isError, retry } = useMyApplications();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 p-4" role="status" aria-label="지원 현황을 불러오는 중">
        <Skeleton className="h-[72px]" />
        <Skeleton className="h-[72px]" />
        <Skeleton className="h-[72px]" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="px-4 pt-16">
        <EmptyState
          icon={<WifiOff size={48} className="text-faint" aria-hidden />}
          title="지원 현황을 불러오지 못했어요"
          description="네트워크 상태를 확인하고 다시 시도해 주세요"
          actionLabel="다시 시도"
          actionVariant="secondary"
          onAction={() => void retry()}
        />
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="px-4 pt-16">
        <EmptyState
          icon={<ClipboardList size={48} className="text-faint" aria-hidden />}
          title="아직 지원한 가게가 없어요"
          description="마음에 드는 가게를 찾아 지원해 보세요"
          actionLabel="찜한 가게 보기"
          actionTo="/wishlist"
        />
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2 px-3 py-3">
      {applications.map((application) => (
        <li key={application.id}>
          <Link
            to={`/settings/applications/${application.id}`}
            className="border-line-soft relative flex min-h-[80px] items-center gap-3 rounded-tile border bg-surface py-3 pr-3 pl-5 active:bg-subtle"
          >
            <span
              className={`absolute top-3 bottom-3 left-2 w-[3px] rounded-full ${applicationBarClass(application.status)}`}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="clamp-1 text-[15px] font-semibold text-ink">
                {application.job.storeName}
              </p>
              <p className="mt-1 text-[12px] text-faint">
                {application.job.category} · {formatApplicationDate(application.createdAt)}
              </p>
            </div>
            <Badge variant={applicationBadgeVariant(application.status)}>
              {MY_APPLICATION_STATUS_LABEL[application.status]}
            </Badge>
            <ChevronRight size={18} className="shrink-0 text-faint" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}
