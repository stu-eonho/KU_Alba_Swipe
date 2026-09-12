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
import { useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { useToast } from '@/components/ui';
import { BackFace, NotFoundState, WishlistGridSkeleton } from '@/features/wishlist';
import { useDeck } from '@/hooks/useDeck';
import { useReviews } from '@/hooks/useReviews';
import { useWishlist } from '@/hooks/useWishlist';
import type { Job } from '@/types';

export default function JobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const queryClient = useQueryClient();
  const toast = useToast();

  /**
   * 공고는 이미 받아 둔 캐시에서만 찾는다(ApplyPage와 같은 방식 — 단건 조회 훅이 없다).
   *   1) 찜한 공고 → ['swipes'] (useWishlist)
   *   2) 홈 덱에서 탭해서 들어온 공고 → 아직 찜 전이라 ['jobs'] 덱 캐시에 있다
   */
  const { entries, isLoading, remove, removeError } = useWishlist();
  const { swipe, swipeError } = useDeck({ includeIncompatible: true });
  const deckJobs = queryClient.getQueryData<Job[]>(['jobs']);
  const cachedJob =
    entries.find((entry) => entry.job.id === jobId)?.job ??
    deckJobs?.find((deckJob) => deckJob.id === jobId);
  const [jobSnapshot, setJobSnapshot] = useState<Job | null>(() => cachedJob ?? null);
  const [wishlistOverride, setWishlistOverride] = useState<boolean | null>(null);
  const job = cachedJob ?? jobSnapshot;
  const storedWishlisted = entries.some((entry) => entry.job.id === jobId);
  const isWishlisted = wishlistOverride ?? storedWishlisted;

  useEffect(() => {
    if (removeError || swipeError) toast.error('찜 상태를 저장하지 못했어요');
  }, [removeError, swipeError, toast]);

  const toggleWishlist = () => {
    if (!job) return;
    setJobSnapshot(job);
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
      <BackFace
        job={job}
        reviews={reviews}
        isWishlisted={isWishlisted}
        onToggleWishlist={toggleWishlist}
      />
    </div>
  );
}
