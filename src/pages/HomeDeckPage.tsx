/**
 * OWNER: 개발자 B (deck-interaction) — 단독 소유
 *
 * ALBASWIPE_SPEC.md <home_deck_view>. 이 앱의 심장.
 *
 * 탑바·탭바는 라우터의 MainLayout이 이미 감싸고 있다. 여기서 AppShell을 쓰면 두 개가 된다.
 * 화면 컨테이너에 overflow-hidden을 주는 이유: 카드가 화면 밖으로 날아갈 때
 * 가로 스크롤이 생기거나 드래그 중 페이지가 같이 움직이는 것을 막는다.
 */
import { useCallback, useEffect, useState } from 'react';
import { SearchX, WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState, Skeleton, useToast } from '@/components/ui';
import { ErrorBoundary } from '@/components/layout';
import { CardStack, SwipeControls } from '@/features/deck';
import { ExpandedCard } from '@/features/wishlist';
import {
  TUTORIAL_ACTIVE_EVENT,
  emitTutorialSwipe,
  type TutorialActiveDetail,
} from '@/features/onboarding';
import { useDeck } from '@/hooks/useDeck';
import { useReviews } from '@/hooks/useReviews';
import type { Job, SwipeDirection } from '@/types';

export default function HomeDeckPage() {
  /**
   * 시간이 맞지 않는 공고까지 볼지. "전체 보기"가 이 값만 뒤집고,
   * useDeck이 같은 ['jobs'] 캐시를 로컬에서 다시 거르므로 네트워크 왕복이 없다.
   */
  const [includeIncompatible, setIncludeIncompatible] = useState(false);
  const { jobs, isLoading, isError, retry, swipe, swipeError, hiddenCount, hasAvailability } =
    useDeck(includeIncompatible);
  const toast = useToast();

  /**
   * 카드를 탭하면 열리는 상세 카드. 찜 화면과 **같은 ExpandedCard**를 쓴다.
   * layoutId가 `card-${job.id}`로 같으므로 덱 카드 → 상세 카드 확대가 그대로 붙는다.
   */
  const [expandedJob, setExpandedJob] = useState<Job | null>(null);

  /**
   * 튜토리얼이 떠 있는 동안에는 카드 탭(상세 열기)을 막는다.
   * 인터랙티브 튜토리얼은 z-80, 상세 카드는 z-50이라 상세가 열리면 스크림 뒤에 깔려
   * 무슨 일이 일어난 건지 알 수 없게 된다. 스와이프는 그대로 열어 둔다 — 그게 과제다.
   */
  const [tutorialActive, setTutorialActive] = useState(false);
  useEffect(() => {
    const onTutorial = (event: Event) => {
      const detail = (event as CustomEvent<TutorialActiveDetail>).detail;
      setTutorialActive(Boolean(detail?.active));
    };
    window.addEventListener(TUTORIAL_ACTIVE_EVENT, onTutorial);
    return () => window.removeEventListener(TUTORIAL_ACTIVE_EVENT, onTutorial);
  }, []);

  const handleSwipe = useCallback(
    (job: Job, direction: SwipeDirection) => {
      // CRITICAL: 낙관적. 카드는 이미 날아갔다. useDeck이 ['jobs'] 캐시에서 빼준다.
      // 실패해도 되돌리지 않는다 — 이미 다음 카드를 보고 있다.
      swipe(job.id, direction);
      // 인터랙티브 튜토리얼의 "실제로 밀어보기" 단계가 이 신호 하나만 듣는다.
      // 새 제스처 이벤트를 만들지 않는다 — useSwipeGesture는 손대지 않았다.
      emitTutorialSwipe(direction);
    },
    [swipe],
  );

  // 저장 실패는 토스트로만 알린다. UI는 그대로 둔다.
  useEffect(() => {
    if (swipeError) toast.error('저장에 실패했어요. 네트워크를 확인해 주세요');
  }, [swipeError, toast]);

  // 안내 줄은 로딩·에러가 아닐 때만. 덱이 비어 있어도(전부 걸러진 경우) 보여야 한다.
  const notice = !isLoading && !isError && (
    <AvailabilityNotice
      hasAvailability={hasAvailability}
      hiddenCount={hiddenCount}
      includeIncompatible={includeIncompatible}
      onToggle={() => setIncludeIncompatible((prev) => !prev)}
    />
  );
  const hasNotice = Boolean(notice);

  return (
    <div className="flex flex-col overflow-hidden">
      {notice}
      {isLoading ? (
        <DeckLoading />
      ) : isError ? (
        <div className="flex flex-col items-center px-4 pt-16">
          <EmptyState
            icon={<WifiOff size={48} className="text-faint" />}
            title="공고를 불러오지 못했어요"
            actionLabel="다시 시도"
            actionVariant="secondary"
            onAction={() => void retry()}
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
          <CardStack
            jobs={jobs}
            onSwipe={handleSwipe}
            onCardTap={tutorialActive ? undefined : setExpandedJob}
            expandedJobId={expandedJob?.id ?? null}
            // 안내 줄이 있으면 카드 스택의 mt-4(16px)를 8px로 당긴다
            className={hasNotice ? '-mt-2' : undefined}
          />
        </ErrorBoundary>
      )}

      <ExpandedCardWithReviews job={expandedJob} onClose={() => setExpandedJob(null)} />
    </div>
  );
}

/**
 * 리뷰는 카드가 열릴 때만 가져온다. useReviews는 jobId가 비면 요청하지 않으므로
 * 닫힌 상태에서는 네트워크 호출이 없다. (WishlistPage와 같은 패턴)
 */
function ExpandedCardWithReviews({ job, onClose }: { job: Job | null; onClose: () => void }) {
  const { reviews } = useReviews(job?.id ?? '');
  return <ExpandedCard job={job} onClose={onClose} reviews={reviews} />;
}

/**
 * 덱 카드 위 한 줄. "내 가능 시간과 겹치지 않는 공고 N건을 숨겼어요" + 전체 보기.
 *
 * 규칙 세 가지:
 *  1) 가능 시간을 등록하지 않았으면 숨긴 게 없다 → 등록을 권하는 줄로 바꾼다.
 *  2) hiddenCount === 0 이면 줄을 아예 그리지 않는다. "0건을 숨겼어요"는 잡음이다.
 *  3) 전체 보기로 켠 뒤에는 숨긴 게 아니라 함께 보고 있는 것이므로 문구도 바뀐다.
 *
 * 행 높이를 44px로 잡아 우측 텍스트 버튼이 그대로 터치 타겟 하한을 만족한다.
 */
function AvailabilityNotice({
  hasAvailability,
  hiddenCount,
  includeIncompatible,
  onToggle,
}: {
  hasAvailability: boolean;
  hiddenCount: number;
  includeIncompatible: boolean;
  onToggle: () => void;
}) {
  const actionClass =
    'text-muted shrink-0 inline-flex h-11 items-center px-1 text-[12px] leading-[1.35] font-medium underline underline-offset-2 transition-transform duration-100 ease-out active:scale-[0.97]';

  if (!hasAvailability) {
    return (
      <div className="flex min-h-11 items-center justify-between gap-3 px-4">
        <p className="text-faint min-w-0 text-[12px] leading-[1.35]">
          가능한 시간을 등록하면 딱 맞는 공고만 보여드려요
        </p>
        <Link to="/settings/availability" className={actionClass}>
          설정하기
        </Link>
      </div>
    );
  }

  if (hiddenCount === 0) return null;

  return (
    <div className="flex min-h-11 items-center justify-between gap-3 px-4">
      <p className="text-faint min-w-0 text-[12px] leading-[1.35]">
        {includeIncompatible
          ? `시간이 맞지 않는 공고 ${hiddenCount}건도 함께 보고 있어요`
          : `내 가능 시간과 겹치지 않는 공고 ${hiddenCount}건을 숨겼어요`}
      </p>
      <button type="button" onClick={onToggle} className={actionClass}>
        {includeIncompatible ? '맞는 공고만' : '전체 보기'}
      </button>
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
