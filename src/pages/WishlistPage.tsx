/**
 * OWNER: 개발자 B (screen-composer)
 *
 * ALBASWIPE_SPEC.md <wishlist_view>
 *  - 헤더 제목은 개수를 포함한다 ("찜한 공고 8") → useTopBarTitle로 라우트 기본 제목을 덮어쓴다
 *  - 로딩: 격자 스켈레톤 4개(2x2) / 에러: WifiOff + 다시 시도 / 비었음: Heart + 공고 보러 가기
 *  - 찜 해제는 낙관적 제거 + 토스트 "찜을 해제했어요"(되돌리기)
 *
 * 경계: 셀을 탭했을 때의 확대·뒤집기는 deck-interaction 소유다.
 *       이 페이지는 `expandedJob` 상태와 onCardClick만 들고 있고, 오버레이는 그리지 않는다.
 *
 * AppShell을 직접 쓰지 않는다 — 라우터의 MainLayout이 이미 감싸고 있다.
 */
import { useState } from 'react';
import { useTopBarTitle } from '@/components/layout';
import { useToast } from '@/components/ui';
import {
  ExpandedCard,
  LoadErrorState,
  WishlistEmpty,
  WishlistGrid,
  WishlistGridSkeleton,
} from '@/features/wishlist';
import { useWishlist } from '@/hooks/useWishlist';
import { useReviews } from '@/hooks/useReviews';
import { useDeck } from '@/hooks/useDeck';
import type { Job } from '@/types';

export default function WishlistPage() {
  const { entries, isLoading, isError, retry, remove } = useWishlist();
  const toast = useToast();

  /**
   * 찜 해제 되돌리기용. useWishlist.remove()는 direction을 'left'로 내리기만 하고
   * 복구 함수를 주지 않으므로, 같은 레코드를 'right'로 다시 올려 되살린다.
   * useDeck.swipe()는 upsert라 이 용도에 그대로 맞는다(덱 캐시에서 빼는 부수효과도
   * 올바르다 — 되살린 공고가 덱에 다시 나오면 안 된다).
   */
  const { swipe } = useDeck();

  /**
   * 확대된 카드로 띄울 공고. 오버레이는 <ExpandedCard>가 렌더한다 (deck-interaction 소유).
   * 격자 셀의 layoutId는 `card-${job.id}` — GridCard의 gridCardLayoutId()가 단일 소스다.
   */
  const [expandedJob, setExpandedJob] = useState<Job | null>(null);

  // 로딩 중에는 개수를 붙이지 않는다 — "찜한 공고 0"이 번쩍이면 비어 있는 것처럼 보인다
  useTopBarTitle(isLoading || isError ? '찜한 공고' : `찜한 공고 ${entries.length}`);

  if (isLoading) {
    return <WishlistGridSkeleton />;
  }

  if (isError) {
    return <LoadErrorState title="찜 목록을 불러오지 못했어요" onRetry={() => void retry()} />;
  }

  if (entries.length === 0) {
    return <WishlistEmpty />;
  }

  const handleUnwishlist = (job: Job) => {
    remove(job.id);
    if (expandedJob?.id === job.id) setExpandedJob(null);
    toast.success('찜을 해제했어요', {
      actionLabel: '되돌리기',
      onAction: () => swipe(job.id, 'right'),
    });
  };

  return (
    <>
      {/* 확대 중인 셀은 숨긴다 — 확대 카드와 원본이 동시에 보이면 전환이 겹쳐 보인다 */}
      <WishlistGrid
        entries={entries}
        onCardClick={setExpandedJob}
        onUnwishlist={handleUnwishlist}
        expandedJobId={expandedJob?.id ?? null}
      />

      <ExpandedCardWithReviews job={expandedJob} onClose={() => setExpandedJob(null)} />
    </>
  );
}

/**
 * 리뷰는 카드가 열릴 때만 가져온다. useReviews는 jobId가 비면 요청하지 않으므로
 * 닫힌 상태에서는 네트워크 호출이 없다.
 */
function ExpandedCardWithReviews({ job, onClose }: { job: Job | null; onClose: () => void }) {
  const { reviews } = useReviews(job?.id ?? '');
  return <ExpandedCard job={job} onClose={onClose} reviews={reviews} />;
}
