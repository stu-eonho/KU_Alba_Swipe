/**
 * OWNER: 개발자 B (deck-interaction)
 *
 * PHASE7_PLAN.md F3 — 홈 상세보기를 단일 창으로.
 *
 * 홈 덱과 찜 목록에서 카드를 탭하면 모두 이 전체 화면으로 **이동**한다.
 * 진입 위치에 따라 상세 표현이 달라지면 같은 공고가 다른 기능처럼 느껴지므로 한 경로로 통일한다.
 *
 * 자체 헤더를 만들지 않는다 — 라우터의 FullscreenLayout이 56px 탑바 + 뒤로가기(useSmartBack('/'))를
 * 이미 렌더한다. 그래서 BackFace에 onClose를 넘기지 않는다: 넘기면 우상단 X가 하나 더 생겨
 * 닫는 방법이 둘이 된다.
 */
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useToast } from '@/components/ui';
import { BackFace, LoadErrorState, NotFoundState, WishlistGridSkeleton } from '@/features/wishlist';
import { useDeck } from '@/hooks/useDeck';
import { useJob } from '@/hooks/useJob';
import { useReviews } from '@/hooks/useReviews';
import { useWishlist } from '@/hooks/useWishlist';

export default function JobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const toast = useToast();

  // 상세는 덱/찜 캐시와 분리된 ['job', id]를 쓴다. 찜 mutation이 덱에서 공고를
  // 제거해도 지금 보고 있는 상세가 사라지지 않는다.
  const { job, isLoading: isJobLoading, isError: isJobError, retry } = useJob(jobId);
  const { entries, remove, removeError } = useWishlist();
  const { swipe, swipeError } = useDeck({ includeIncompatible: true });
  const [wishlistOverride, setWishlistOverride] = useState<boolean | null>(null);
  const storedWishlisted = entries.some((entry) => entry.job.id === jobId);
  const isWishlisted = wishlistOverride ?? storedWishlisted;

  useEffect(() => {
    if (removeError || swipeError) toast.error('찜 상태를 저장하지 못했어요');
  }, [removeError, swipeError, toast]);

  const toggleWishlist = () => {
    if (!job) return;
    if (isWishlisted) {
      setWishlistOverride(false);
      remove(job.id);
      toast.success('찜에서 뺐어요');
      return;
    }
    setWishlistOverride(true);
    swipe(job.id, 'right');
    toast.success('찜에 담았어요');
  };

  // 리뷰는 jobId가 비면 요청하지 않는다(useReviews의 enabled).
  const { reviews } = useReviews(job?.id ?? '');

  if (isJobLoading) {
    return <WishlistGridSkeleton />;
  }

  if (isJobError) {
    return <LoadErrorState onRetry={() => void retry()} />;
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
      <BackFace
        job={job}
        reviews={reviews}
        isWishlisted={isWishlisted}
        onToggleWishlist={toggleWishlist}
      />
    </div>
  );
}
