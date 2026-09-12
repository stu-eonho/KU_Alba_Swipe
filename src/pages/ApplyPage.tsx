/**
 * OWNER: 개발자 B (screen-composer)
 *
 * ALBASWIPE_SPEC.md <apply_view>
 *
 * 자체 헤더를 만들지 않는다 — 라우터의 FullscreenLayout이 56px 탑바 + 뒤로가기 +
 * 중앙 "지원하기"를 이미 렌더한다. 여기서 또 만들면 탑바가 두 개가 된다.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { ApplyForm } from '@/features/apply/ApplyForm';
import { NotFoundState } from '@/features/wishlist';
import { useWishlist } from '@/hooks/useWishlist';
import { WishlistGridSkeleton } from '@/features/wishlist';
import type { Job } from '@/types';

export default function ApplyPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const queryClient = useQueryClient();

  /**
   * 진입 경로가 둘이다.
   *   1) 찜 목록의 카드 뒷면 → ['swipes'] 캐시에 있다
   *   2) 홈 덱에서 카드를 탭해 연 상세 → 아직 찜하지 않았으므로 ['swipes']에는 없고
   *      덱 캐시 ['jobs']에 있다
   * 둘 다 이미 받아 둔 데이터라 단건 조회 훅 없이 캐시만 본다(추가 요청 없음).
   */
  const { entries, isLoading } = useWishlist();
  const deckJobs = queryClient.getQueryData<Job[]>(['jobs']);
  const job =
    entries.find((entry) => entry.job.id === jobId)?.job ??
    deckJobs?.find((deckJob) => deckJob.id === jobId);

  // 덱 캐시에서 이미 찾았다면 찜 목록 로딩을 기다릴 이유가 없다
  if (isLoading && !job) {
    return <WishlistGridSkeleton />;
  }

  if (!job) {
    return <NotFoundState />;
  }

  return <ApplyForm job={job} />;
}
