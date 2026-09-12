/**
 * OWNER: 개발자 B (deck-interaction)
 *
 * PHASE7_PLAN.md F3 — 홈 상세보기를 단일 창으로.
 *
 * 홈 덱에서 카드를 탭하면 확대 오버레이 대신 이 화면으로 **이동**한다.
 * "한 장씩 넘기다 하나를 자세히 본다"는 맥락이라 전체 화면이 맞다.
 * (찜 목록은 "4개를 나란히 비교하다 하나를 크게 본다"라 ExpandedCard 오버레이를 그대로 쓴다.)
 *
 * 자체 헤더를 만들지 않는다 — 라우터의 FullscreenLayout이 56px 탑바 + 뒤로가기(useSmartBack('/'))를
 * 이미 렌더한다. 그래서 BackFace에 onClose를 넘기지 않는다: 넘기면 우상단 X가 하나 더 생겨
 * 닫는 방법이 둘이 된다.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { BackFace, NotFoundState, WishlistGridSkeleton } from '@/features/wishlist';
import { useReviews } from '@/hooks/useReviews';
import { useWishlist } from '@/hooks/useWishlist';
import type { Job } from '@/types';

export default function JobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const queryClient = useQueryClient();

  /**
   * 공고는 이미 받아 둔 캐시에서만 찾는다(ApplyPage와 같은 방식 — 단건 조회 훅이 없다).
   *   1) 찜한 공고 → ['swipes'] (useWishlist)
   *   2) 홈 덱에서 탭해서 들어온 공고 → 아직 찜 전이라 ['jobs'] 덱 캐시에 있다
   */
  const { entries, isLoading } = useWishlist();
  const deckJobs = queryClient.getQueryData<Job[]>(['jobs']);
  const job =
    entries.find((entry) => entry.job.id === jobId)?.job ??
    deckJobs?.find((deckJob) => deckJob.id === jobId);

  // 리뷰는 jobId가 비면 요청하지 않는다(useReviews의 enabled).
  const { reviews } = useReviews(job?.id ?? '');

  // 덱 캐시에서 이미 찾았다면 찜 목록 로딩을 기다릴 이유가 없다
  if (isLoading && !job) {
    return <WishlistGridSkeleton />;
  }

  if (!job) {
    return <NotFoundState />;
  }

  /*
   * 탑바 56px를 뺀 높이를 고정해 BackFace의 h-full이 실제 높이를 얻는다.
   * 그래야 본문만 안에서 스크롤되고 하단 "지원하기"가 화면 아래에 붙어 있는다.
   */
  return (
    <div className="h-[calc(100dvh-56px)]">
      <BackFace job={job} reviews={reviews} />
    </div>
  );
}
