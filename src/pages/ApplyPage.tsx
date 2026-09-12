/**
 * OWNER: 개발자 B (screen-composer)
 *
 * ALBASWIPE_SPEC.md <apply_view>
 *
 * 자체 헤더를 만들지 않는다 — 라우터의 FullscreenLayout이 56px 탑바 + 뒤로가기 +
 * 중앙 "지원하기"를 이미 렌더한다. 여기서 또 만들면 탑바가 두 개가 된다.
 */
import { useParams } from 'react-router-dom';
import { ApplyForm } from '@/features/apply/ApplyForm';
import { NotFoundState } from '@/features/wishlist';
import { useWishlist } from '@/hooks/useWishlist';
import { WishlistGridSkeleton } from '@/features/wishlist';

export default function ApplyPage() {
  const { jobId } = useParams<{ jobId: string }>();
  /**
   * 이 화면은 항상 찜 목록의 카드 뒷면에서 들어온다. 그래서 단건 조회 훅 없이
   * ['swipes'] 캐시에서 찾는다 — 이미 받아 둔 데이터라 추가 요청이 없다.
   */
  const { entries, isLoading } = useWishlist();
  const job = entries.find((entry) => entry.job.id === jobId)?.job;

  if (isLoading) {
    return <WishlistGridSkeleton />;
  }

  if (!job) {
    return <NotFoundState />;
  }

  return <ApplyForm job={job} />;
}
