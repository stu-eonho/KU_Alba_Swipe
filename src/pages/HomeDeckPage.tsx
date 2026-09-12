/**
 * OWNER: 개발자 B (deck-interaction) — 단독 소유
 *
 * ALBASWIPE_SPEC.md <home_deck_view>. 이 앱의 심장.
 *
 * 탑바·탭바는 라우터의 MainLayout이 이미 감싸고 있다. 여기서 AppShell을 쓰면 두 개가 된다.
 * 화면 컨테이너에 overflow-hidden을 주는 이유: 카드가 화면 밖으로 날아갈 때
 * 가로 스크롤이 생기거나 드래그 중 페이지가 같이 움직이는 것을 막는다.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { MapPinOff, SearchX, SlidersHorizontal, WifiOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { EmptyState, IconButton, Skeleton, useToast } from '@/components/ui';
import { ErrorBoundary } from '@/components/layout';
import {
  CardStack,
  RegionFilterSheet,
  SwipeControls,
  getRegions,
  setRegions,
} from '@/features/deck';
import {
  TUTORIAL_ACTIVE_EVENT,
  emitTutorialSwipe,
  type TutorialActiveDetail,
} from '@/features/onboarding';
import { useDeck } from '@/hooks/useDeck';
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
  const navigate = useNavigate();

  /**
   * 지역 필터. useDeck 은 건드리지 않고 화면단에서 거른다 —
   * 공고가 60건 규모라 한 번 더 훑는 비용이 네트워크 왕복보다 싸고,
   * useDeck 은 개발자 A 소유라 시그니처를 늘릴 수 없다.
   *
   * 초기값을 lazy initializer 로 읽는 이유: localStorage 접근은 렌더마다 할 일이 아니고,
   * 시크릿 모드에서는 throw 할 수 있어서 regionStorage 안에서만 다루게 가둔다.
   */
  const [regions, setRegionState] = useState<string[]>(() => getRegions());
  const [sheetOpen, setSheetOpen] = useState(false);

  const applyRegions = useCallback((next: string[]) => {
    setRegionState(next);
    setRegions(next);
    setSheetOpen(false);
  }, []);

  // 빈 배열 = 전국 = 필터 없음. 이때는 원본 배열을 그대로 넘겨 참조를 유지한다.
  const visibleJobs = useMemo(
    () => (regions.length === 0 ? jobs : jobs.filter((job) => regions.includes(job.region))),
    [jobs, regions],
  );

  /**
   * "지역 때문에 0건"과 "덱을 다 봤다"를 구분한다.
   * 구분하지 않으면 서울 외 지역을 골랐을 때 "오늘 볼 공고를 다 봤어요!"가 떠서
   * 필터가 고장 난 것처럼 보인다 (지금 시드 데이터가 전부 서울이라 실제로 자주 생긴다).
   */
  const filteredToEmpty = visibleJobs.length === 0 && jobs.length > 0 && regions.length > 0;

  /**
   * 카드를 탭하면 확대 오버레이가 아니라 `/jobs/:jobId` 전체 화면으로 **이동**한다 (PHASE7 F3).
   * 홈은 "한 장씩 넘기다 하나를 자세히 본다"라 창이 맞다.
   * 찜 목록은 "여러 개를 비교하다 하나를 크게 본다"라 ExpandedCard 오버레이를 그대로 쓴다 — 건드리지 않았다.
   */
  const openJobDetail = useCallback((job: Job) => navigate(`/jobs/${job.id}`), [navigate]);

  /**
   * 튜토리얼이 떠 있는 동안에는 카드 탭(상세 열기)을 막는다.
   * 튜토리얼 도중에 다른 화면으로 나가 버리면 스포트라이트가 가리키던 대상이 사라진다.
   * 스와이프는 그대로 열어 둔다 — 그게 과제다.
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
  // 지역 안내 줄은 선택된 지역이 있을 때만. 전국이면 잡음이라 그리지 않는다.
  const regionNotice = regions.length > 0 && (
    <RegionNotice regions={regions} onClear={() => applyRegions([])} />
  );
  const hasNotice = Boolean(notice) || Boolean(regionNotice);

  return (
    <div className="flex flex-col overflow-hidden">
      {/*
        필터 버튼은 페이지 본문 최상단에 둔다. 탑바는 AppShell 이 그리고 router.tsx 가
        소유하므로 건드리지 않는다. 우측 정렬 한 줄이라 시간 안내 줄과 높이를 나눠 쓴다.
      */}
      <div className="flex min-h-11 items-center justify-end px-2">
        <IconButton
          label="지역 필터"
          onClick={() => setSheetOpen(true)}
          aria-expanded={sheetOpen}
          className="relative"
        >
          <SlidersHorizontal size={20} strokeWidth={1.75} aria-hidden />
          {regions.length > 0 && (
            <span
              aria-hidden
              className="bg-brand absolute top-1.5 right-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-none font-semibold text-white"
            >
              {regions.length}
            </span>
          )}
        </IconButton>
      </div>
      {regionNotice}
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
      ) : filteredToEmpty ? (
        // 덱 소진과 반드시 구분한다 — 여기서 "다 봤어요"가 뜨면 사용자는 필터가
        // 고장 났다고 읽는다. 빠져나갈 문(지역 바꾸기)을 같이 준다.
        <div className="flex flex-col items-center px-4 pt-16">
          <EmptyState
            icon={<MapPinOff size={56} className="text-faint" />}
            title="선택한 지역에 공고가 없어요"
            description={`${formatRegions(regions)} 대신 다른 지역을 골라 보세요`}
            actionLabel="지역 바꾸기"
            actionVariant="secondary"
            onAction={() => setSheetOpen(true)}
          />
        </div>
      ) : visibleJobs.length === 0 ? (
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
            jobs={visibleJobs}
            onSwipe={handleSwipe}
            onCardTap={tutorialActive ? undefined : openJobDetail}
            // 안내 줄이 있으면 카드 스택의 mt-4(16px)를 8px로 당긴다
            className={hasNotice ? '-mt-2' : undefined}
          />
        </ErrorBoundary>
      )}

      <RegionFilterSheet
        open={sheetOpen}
        value={regions}
        onApply={applyRegions}
        onClose={() => setSheetOpen(false)}
      />
    </div>
  );
}

/** "서울", "서울 · 경기", 3개 이상이면 "서울 외 2곳" */
function formatRegions(regions: string[]) {
  if (regions.length <= 2) return regions.join(' · ');
  return `${regions[0]} 외 ${regions.length - 1}곳`;
}

/**
 * 지역 안내 줄. 시간 안내 줄(AvailabilityNotice)과 같은 치수·톤을 쓴다 —
 * 두 줄이 같이 뜰 수 있어서 서로 다른 모양이면 화면이 어수선해진다.
 * 우측 "전체 지역"이 필터 해제다.
 */
function RegionNotice({ regions, onClear }: { regions: string[]; onClear: () => void }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 px-4">
      <p className="text-faint min-w-0 truncate text-[12px] leading-[1.35]">
        {formatRegions(regions)} 공고만 보고 있어요
      </p>
      <button
        type="button"
        onClick={onClear}
        className="text-muted shrink-0 inline-flex h-11 items-center px-1 text-[12px] leading-[1.35] font-medium underline underline-offset-2 transition-transform duration-100 ease-out active:scale-[0.97]"
      >
        전체 지역
      </button>
    </div>
  );
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
