/**
 * OWNER: 개발자 B (deck-interaction) — 단독 소유
 *
 * ALBASWIPE_SPEC.md <home_deck_view>. 이 앱의 심장.
 *
 * 탑바·탭바는 라우터의 MainLayout이 이미 감싸고 있다. 여기서 AppShell을 쓰면 두 개가 된다.
 * 화면 컨테이너에 overflow-hidden을 주는 이유: 카드가 화면 밖으로 날아갈 때
 * 가로 스크롤이 생기거나 드래그 중 페이지가 같이 움직이는 것을 막는다.
 */
import { useCallback } from 'react';
import { SearchX, WifiOff } from 'lucide-react';
import { EmptyState, Skeleton } from '@/components/ui';
import { ErrorBoundary } from '@/components/layout';
import { CardStack, SwipeControls } from '@/features/deck';
import { MOCK_JOBS } from '@/features/deck/mockJobs';
import type { Job, SwipeDirection } from '@/types';

export default function HomeDeckPage() {
  // TODO(통합): A의 useDeck 완성 시 교체 →  const { jobs, isLoading, isError, swipe } = useDeck();
  const jobs = MOCK_JOBS;
  const isLoading: boolean = false;
  const isError: boolean = false;

  const handleSwipe = useCallback((job: Job, direction: SwipeDirection) => {
    // CRITICAL: 낙관적. 카드는 이미 날아갔다. 실패해도 되돌리지 않고 토스트로만 알린다.
    // TODO(통합): A의 useDeck 완성 시 →  swipe(job.id, direction);
    void job;
    void direction;
  }, []);

  return (
    <div className="flex flex-col overflow-hidden">
      {isLoading ? (
        <DeckLoading />
      ) : isError ? (
        <div className="flex flex-col items-center px-4 pt-16">
          <EmptyState
            icon={<WifiOff size={48} className="text-faint" />}
            title="공고를 불러오지 못했어요"
            actionLabel="다시 시도"
            actionVariant="secondary"
            // TODO(통합): A의 useDeck 완성 시 →  onAction={refetch}
            onAction={() => window.location.reload()}
          />
        </div>
      ) : jobs.length === 0 ? (
        <div className="flex flex-col items-center px-4 pt-16">
          <EmptyState
            icon={<SearchX size={56} className="text-faint" />}
            title="오늘 볼 공고를 다 봤어요!"
            description="찜한 공고를 비교해 보세요"
            actionLabel="찜 목록 보기"
            actionTo="/wishlist"
          />
        </div>
      ) : (
        // 덱 전용 바운더리: 카드 렌더 오류가 앱 전체를 흰 화면으로 만들면 데모가 끝난다.
        // 덱만 폴백으로 바꾸고 탭바는 살려 둔다 (탭바는 라우터 MainLayout 소유).
        <ErrorBoundary inline>
          <CardStack jobs={jobs} onSwipe={handleSwipe} />
        </ErrorBoundary>
      )}
    </div>
  );
}

/** <loading_state> 카드 모양 Skeleton 1장 + 컨트롤 버튼 비활성화 */
function DeckLoading() {
  return (
    <div className="flex flex-col items-center">
      <div className="mx-auto mt-4 w-[calc(100%-32px)] max-w-[448px]">
        <Skeleton variant="card" />
      </div>
      <SwipeControls onNope={() => {}} onLike={() => {}} disabled />
    </div>
  );
}
