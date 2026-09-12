/**
 * OWNER: 개발자 B (deck-interaction) — 단독 소유
 *
 * PHASE4_PLAN.md B-2 · 보류 탭
 *
 * 탑바·탭바는 라우터의 MainLayout이 이미 감싸고 있다. 여기서 AppShell을 쓰면 두 개가 된다.
 *
 * 통합 완료 — 개발자 A의 `useHeldApplicants()`를 그대로 쓴다.
 *
 * restore 인자 문제
 * -----------------
 * 훅은 `restore(seekerId, jobId)` 2개를 받는데 `HeldApplicantList`의 `onRestore`는
 * `seekerId` 하나만 준다. 컴포넌트 props를 바꾸는 대신 **여기서 `held`를 뒤져
 * 해당 지원자의 `job.id`를 찾아 붙인다.** 목록이 이미 손에 있으니 조회가 공짜고,
 * 리스트 컴포넌트는 "지원자 한 명"만 알면 되는 순수 컴포넌트로 남는다.
 */
import { EmptyState, Skeleton, useToast } from '@/components/ui';
import { WifiOff } from 'lucide-react';
import { HeldApplicantList } from '@/features/employer-deck';
import { useHeldApplicants } from '@/hooks/useApplicantDeck';

export default function EmployerHeldPage() {
  const toast = useToast();
  const { held, isLoading, isError, restore } = useHeldApplicants();

  const handleRestore = (seekerId: string) => {
    const target = held.find((entry) => entry.seeker.id === seekerId);
    // 훅이 낙관적으로 목록에서 빼준다 — 여기서 따로 상태를 들고 있지 않는다.
    restore(seekerId, target?.job.id ?? null);
    toast.success(`${target?.seeker.nickname ?? '지원자'}님을 덱으로 되돌렸어요`);
  };

  if (isLoading) {
    return (
      <div className="p-4" role="status" aria-label="보류한 지원자를 불러오는 중">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="mb-2 h-[64px]" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        icon={<WifiOff size={48} className="text-faint" aria-hidden />}
        title="보류함을 불러오지 못했어요"
        description="네트워크 상태를 확인하고 다시 시도해 주세요"
        actionLabel="지원자 보러 가기"
        actionVariant="secondary"
        actionTo="/employer/applicants"
      />
    );
  }

  return <HeldApplicantList entries={held} onRestore={handleRestore} />;
}
