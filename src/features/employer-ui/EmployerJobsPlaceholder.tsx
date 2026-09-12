import { BriefcaseBusiness } from 'lucide-react';
import { EmptyState } from '@/components/ui';

export function EmployerJobsPlaceholder() {
  return (
    <EmptyState
      icon={<BriefcaseBusiness size={52} className="text-faint" aria-hidden />}
      title="내 공고 관리는 준비 중이에요"
      description="지금은 지원자 탭에서 공고별 지원 현황을 확인할 수 있어요"
      actionLabel="지원자 보기"
      actionTo="/employer/applicants"
      actionVariant="secondary"
      className="min-h-[calc(100dvh-136px)]"
    />
  );
}
