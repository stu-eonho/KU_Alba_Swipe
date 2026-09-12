/**
 * OWNER: 개발자 B (deck-interaction) — 단독 소유
 *
 * PHASE4_PLAN.md B-2 · 보류 탭
 *
 * 탑바·탭바는 라우터의 MainLayout이 이미 감싸고 있다. 여기서 AppShell을 쓰면 두 개가 된다.
 *
 * ⚠️ 통합 지점 — 개발자 A의 `useApplicantDeck()`이 오면 여기 세 줄만 바꾼다:
 *     const { held, restore } = useApplicantDeck();
 *     <HeldApplicantList entries={held} onRestore={restore} />
 *   그리고 `src/features/employer-deck/mockApplicants.ts`를 삭제한다.
 *   `HeldApplicantList`는 순수 prop 컴포넌트라 손댈 필요가 없다.
 */
import { useState } from 'react';
import { useToast } from '@/components/ui';
import { HeldApplicantList } from '@/features/employer-deck';
import { MOCK_APPLICANTS } from '@/features/employer-deck/mockApplicants';
import type { ApplicantEntry } from '@/types';

export default function EmployerHeldPage() {
  const toast = useToast();
  // TODO(통합): useApplicantDeck()의 held로 교체
  const [held, setHeld] = useState<ApplicantEntry[]>(MOCK_APPLICANTS);

  const handleRestore = (seekerId: string) => {
    const target = held.find((entry) => entry.seeker.id === seekerId);
    // TODO(통합): restore(seekerId) 호출로 교체. 낙관적으로 목록에서만 빼둔다.
    setHeld((prev) => prev.filter((entry) => entry.seeker.id !== seekerId));
    toast.success(`${target?.seeker.nickname ?? '지원자'}님을 덱으로 되돌렸어요`);
  };

  return <HeldApplicantList entries={held} onRestore={handleRestore} />;
}
