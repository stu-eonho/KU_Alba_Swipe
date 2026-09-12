import { ClipboardX, WifiOff } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { Badge, EmptyState, Skeleton } from '@/components/ui';
import {
  MY_APPLICATION_STATUS_LABEL,
  applicationBadgeVariant,
  formatApplicationDate,
} from '@/features/apply/applicationPresentation';
import { BackFace } from '@/features/wishlist';
import { useMyApplication } from '@/hooks/useApply';
import { useReviews } from '@/hooks/useReviews';

export default function ApplicationDetailPage() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const { application, isLoading, isError, retry } = useMyApplication(applicationId);
  const { reviews } = useReviews(application?.job.id ?? '');

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 p-4" role="status" aria-label="지원 상세를 불러오는 중">
        <Skeleton className="h-24" />
        <Skeleton className="h-28" />
        <Skeleton className="h-[420px]" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="px-4 pt-16">
        <EmptyState
          icon={<WifiOff size={48} className="text-faint" aria-hidden />}
          title="지원 상세를 불러오지 못했어요"
          actionLabel="다시 시도"
          actionVariant="secondary"
          onAction={() => void retry()}
        />
      </div>
    );
  }

  if (!application) {
    return (
      <div className="px-4 pt-16">
        <EmptyState
          icon={<ClipboardX size={48} className="text-faint" aria-hidden />}
          title="지원 내역을 찾을 수 없어요"
          description="삭제됐거나 볼 수 없는 지원 내역이에요"
          actionLabel="지원 현황으로 돌아가기"
          actionTo="/settings/applications"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <section className="rounded-tile border border-line-soft bg-surface p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="clamp-1 text-[16px] font-semibold text-ink">
            {application.job.storeName}
          </h2>
          <Badge variant={applicationBadgeVariant(application.status)}>
            {MY_APPLICATION_STATUS_LABEL[application.status]}
          </Badge>
        </div>
        <p className="mt-2 text-[12px] text-faint">
          {formatApplicationDate(application.createdAt, true)} 지원
        </p>
      </section>

      <section className="rounded-tile border border-line-soft bg-surface p-4">
        <h2 className="text-[14px] font-semibold text-ink">내가 보낸 내용</h2>
        <p className="mt-2 whitespace-pre-wrap text-[14px] leading-[1.6] text-body">
          {application.message?.trim() || '작성한 한마디가 없어요'}
        </p>
      </section>

      <section className="overflow-hidden rounded-tile border border-line-soft bg-surface">
        <h2 className="border-line-soft border-b px-5 py-4 text-[15px] font-semibold text-ink">
          지원한 가게
        </h2>
        <div className="h-[min(70dvh,560px)]">
          <BackFace job={application.job} reviews={reviews} showApply={false} />
        </div>
      </section>
    </div>
  );
}
