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
import { CalendarCheck, CalendarOff, MapPin, MapPinOff, SearchX, WifiOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { EmptyState, IconButton, Skeleton, useToast } from '@/components/ui';
import { ErrorBoundary } from '@/components/layout';
import {
  CardStack,
  RegionFilterSheet,
  SwipeControls,
  areaOfAddress,
  citiesOf,
  getRegions,
  parseRegion,
  setRegions,
} from '@/features/deck';
import { PreferenceIntroBanner } from '@/features/preferences';
import {
  TUTORIAL_ACTIVE_EVENT,
  emitTutorialSwipe,
  type TutorialActiveDetail,
} from '@/features/onboarding';
import { useDeck, useJobCatalog } from '@/hooks/useDeck';
import { useMyApplications } from '@/hooks/useApply';
import type { Job, SwipeDirection } from '@/types';

export default function HomeDeckPage() {
  /**
   * 시간이 맞지 않는 공고까지 볼지. "전체 보기"가 이 값만 뒤집고,
   * useDeck이 같은 ['jobs'] 캐시를 로컬에서 다시 거르므로 네트워크 왕복이 없다.
   */
  const [includeIncompatible, setIncludeIncompatible] = useState(false);

  /**
   * 지역 필터.
   *
   * 항목은 `"서울"`(시·도 전체) 또는 `"서울>서대문구"`(구까지) 두 가지다 — regionStorage 참조.
   *
   * 초기값을 lazy initializer 로 읽는 이유: localStorage 접근은 렌더마다 할 일이 아니고,
   * 시크릿 모드에서는 throw 할 수 있어서 regionStorage 안에서만 다루게 가둔다.
   */
  const [regions, setRegionState] = useState<string[]>(() => getRegions());
  const [sheetOpen, setSheetOpen] = useState(false);

  /*
   * useDeck 에는 **시·도만** 넘긴다. A 가 Phase 7 에서 useDeck 을
   * { includeIncompatible, regions } 로 확장했고 그쪽이 지역 → 시간 → 취향 순으로 처리한다.
   * 시그니처는 A 소유라 그대로 두고, 구(area) 단위는 아래에서 한 번 더 거른다 (PHASE8 G7).
   */
  const cities = useMemo(() => citiesOf(regions), [regions]);

  const { jobs, isLoading, isError, retry, swipe, swipeError, hiddenCount, hasAvailability } =
    useDeck({ includeIncompatible, regions: cities });

  /*
   * 필터를 걸기 전의 전체 공고. 지역 시트가 "실제로 공고가 있는 구"만 보여주고,
   * 빈 상태를 "이 조건에 공고가 아예 없다"로 판단하는 데 쓴다.
   *
   * useDeck 을 두 번 부르지 않는다 — 같은 ['jobs'] 캐시라 요청은 하나였지만,
   * useDeck 에는 스와이프 뮤테이션과 취향 학습이 딸려 있어 부수효과가 두 벌 생긴다.
   * useJobCatalog 은 같은 캐시를 읽기만 한다.
   */
  const { jobs: catalogJobs } = useJobCatalog();

  const { applications } = useMyApplications();
  const toast = useToast();
  const navigate = useNavigate();

  const applyRegions = useCallback((next: string[]) => {
    setRegionState(next);
    setRegions(next);
    setSheetOpen(false);
  }, []);

  /** 시·도별로 실제 공고가 있는 구/시/군. 지역 시트 2단계가 이걸 그린다. */
  const areasByCity = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    for (const job of catalogJobs) {
      const area = areaOfAddress(job.address);
      if (!job.region || !area) continue;
      (map[job.region] ??= new Set()).add(area);
    }
    return Object.fromEntries(
      Object.entries(map).map(([city, set]) => [city, [...set].sort((a, b) => a.localeCompare(b))]),
    );
  }, [catalogJobs]);

  /**
   * 선택한 지역에 드는 공고인가.
   *
   * `"서울"` 은 서울 전체, `"서울>서대문구"` 는 주소 두 번째 조각이 서대문구인 것만.
   * 빈 배열이면 전국이라 전부 통과한다.
   */
  const matchesRegion = useCallback(
    (job: Job) => {
      if (regions.length === 0) return true;
      return regions.some((entry) => {
        const { city, area } = parseRegion(entry);
        if (job.region !== city) return false;
        if (!area) return true;
        return areaOfAddress(job.address) === area;
      });
    },
    [regions],
  );

  /** 구까지 좁힌 항목이 하나라도 있을 때만 화면에서 한 번 더 거른다 */
  const hasAreaFilter = useMemo(
    () => regions.some((entry) => parseRegion(entry).area !== null),
    [regions],
  );
  const regionJobs = useMemo(
    () => (hasAreaFilter ? jobs.filter(matchesRegion) : jobs),
    [jobs, hasAreaFilter, matchesRegion],
  );

  /*
   * 이미 지원한 공고는 덱에서 뺀다.
   *
   * 스와이프한 공고는 A 가 서버에서 빼 주지만, 지원은 스와이프를 거치지 않을 수 있다 —
   * 홈에서 카드를 탭해 상세로 들어가 바로 지원하면 그 공고는 스와이프 기록이 없어서
   * 계속 덱에 남는다. 이미 지원한 가게가 다시 나오는 게 사용자가 본 증상이다.
   */
  const appliedIds = useMemo(
    () => new Set(applications.map((application) => application.job.id)),
    [applications],
  );
  const visibleJobs = useMemo(
    () =>
      appliedIds.size === 0 ? regionJobs : regionJobs.filter((job) => !appliedIds.has(job.id)),
    [regionJobs, appliedIds],
  );

  /**
   * "지역 때문에 0건"과 "덱을 다 봤다"를 구분한다.
   * 구분하지 않으면 공고가 없는 지역을 골랐을 때 "오늘 볼 공고를 다 봤어요!"가 떠서
   * 필터가 고장 난 것처럼 보인다.
   *
   * PHASE8 G7: 판단 기준을 A 의 regionCount(시·도 기준)에서 **구 필터까지 적용한 건수**로
   * 옮겼다. 시·도에는 공고가 있지만 고른 구에는 없을 때 regionCount 는 0 이 아니라
   * "다 봤어요"가 떠 버린다. 시간·취향 필터를 거치기 전 카탈로그로 세는 것은 그대로다 —
   * 시간 때문에 0 건인 경우는 hiddenCount 안내 줄이 따로 설명한다.
   */
  const selectionCount = useMemo(
    () => (regions.length === 0 ? catalogJobs.length : catalogJobs.filter(matchesRegion).length),
    [catalogJobs, regions, matchesRegion],
  );
  const filteredToEmpty = visibleJobs.length === 0 && regions.length > 0 && selectionCount === 0;

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

  /*
   * 안내 줄은 로딩·에러가 아닐 때만. 덱이 비어 있어도(전부 걸러진 경우) 보여야 한다.
   * 조건을 컴포넌트 밖에서 한 번 더 계산하는 이유: AvailabilityNotice 가 null 을
   * 돌려주더라도 JSX 엘리먼트 자체는 truthy 라, 안 보이는 줄 때문에 카드가 8px 올라간다.
   */
  const showAvailabilityNotice = !isLoading && !isError && hasAvailability && hiddenCount > 0;
  // 지역 안내 줄은 선택된 지역이 있을 때만. 전국이면 잡음이라 그리지 않는다.
  const showRegionNotice = regions.length > 0;
  const hasNotice = showAvailabilityNotice || showRegionNotice;

  /*
   * PHASE8 G5: 화면 전체 높이를 잡고 덱을 남은 공간의 **세로 가운데**에 둔다.
   * 탑바 56 + 탭바 64 를 뺀다(이 화면은 MainLayout 아래라 둘 다 있다).
   * min-h 라서 카드가 작은 화면에서 잘리지 않는다 — 내용이 더 길면 컨테이너가 늘어난다.
   * 100vh 는 쓰지 않는다(모바일 주소창 때문에 화면이 튄다).
   */
  return (
    <div className="flex min-h-[calc(100dvh-56px-64px)] flex-col overflow-hidden">
      {/*
        PHASE8 G3·G4: 상단 한 줄. 왼쪽에 스와이프 가능 건수, 오른쪽에 아이콘 두 개.
        탑바는 AppShell 이 그리고 router.tsx 가 소유하므로 건드리지 않는다.
      */}
      <div className="flex min-h-11 items-center gap-2 px-2">
        {/* 로딩·에러일 때는 그리지 않는다 — 0개로 읽혀 오해된다. 0개일 때는 그린다. */}
        {!isLoading && !isError && (
          <p className="text-muted min-w-0 truncate pl-2 text-[12px] leading-[1.35]">
            스와이프할 수 있는 공고 {visibleJobs.length}개
          </p>
        )}
        <div className="ml-auto flex shrink-0 items-center">
          {/*
            가능 시간 아이콘. 등록돼 있으면 CalendarCheck, 아니면 작대기 그은 CalendarOff.
            aria-label 도 같이 바뀐다 — 아이콘만 바꾸면 스크린리더에는 아무 변화가 없다.
          */}
          <IconButton
            label={hasAvailability ? '가능한 시간 설정됨' : '가능한 시간 미설정'}
            onClick={() => navigate('/settings/availability')}
          >
            {hasAvailability ? (
              <CalendarCheck size={20} strokeWidth={1.75} aria-hidden />
            ) : (
              <CalendarOff size={20} strokeWidth={1.75} aria-hidden />
            )}
          </IconButton>
          {/* 지역 필터. 일반 필터(SlidersHorizontal)가 아니라 MapPin 이라야 뜻이 읽힌다. */}
          <IconButton
            label="지역 필터"
            onClick={() => setSheetOpen(true)}
            aria-expanded={sheetOpen}
            className="relative"
          >
            <MapPin size={20} strokeWidth={1.75} aria-hidden />
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
      </div>
      <PreferenceIntroBanner />
      {showRegionNotice && <RegionNotice regions={regions} onClear={() => applyRegions([])} />}
      {showAvailabilityNotice && (
        <AvailabilityNotice
          hasAvailability={hasAvailability}
          hiddenCount={hiddenCount}
          includeIncompatible={includeIncompatible}
          onToggle={() => setIncludeIncompatible((prev) => !prev)}
        />
      )}

      {/* 남은 세로 공간의 가운데. 빈 상태·에러도 같은 칸 안에서 가운데로 온다 (G5). */}
      <div className="flex flex-1 flex-col justify-center">
        {isLoading ? (
          <DeckLoading />
        ) : isError ? (
          <div className="flex flex-col items-center px-4">
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
          <div className="flex flex-col items-center px-4">
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
          <div className="flex flex-col items-center px-4">
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
      </div>

      <RegionFilterSheet
        open={sheetOpen}
        value={regions}
        areasByCity={areasByCity}
        onApply={applyRegions}
        onClose={() => setSheetOpen(false)}
      />
    </div>
  );
}

/** `"서울>서대문구"` → `"서울 서대문구"`. 안내 줄과 빈 상태에 그대로 쓴다. */
function regionLabel(entry: string) {
  const { city, area } = parseRegion(entry);
  return area ? `${city} ${area}` : city;
}

/** "서울", "서울 · 경기", 3개 이상이면 "서울 외 2곳" */
function formatRegions(regions: string[]) {
  if (regions.length <= 2) return regions.map(regionLabel).join(' · ');
  return `${regionLabel(regions[0])} 외 ${regions.length - 1}곳`;
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
        className="text-muted inline-flex h-11 shrink-0 items-center px-1 text-[12px] leading-[1.35] font-medium underline underline-offset-2 transition-transform duration-100 ease-out active:scale-[0.97]"
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
 *  1) 가능 시간을 등록하지 않았으면 숨긴 게 없다 → 줄을 그리지 않는다.
 *     PHASE8 G4 에서 미등록 안내 문구를 뺐다. 그 정보는 이제 상단의 캘린더 아이콘
 *     (CalendarOff = 시간 필터 꺼짐)이 한 줄을 차지하지 않고 전달한다.
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
    'text-muted inline-flex h-11 shrink-0 items-center px-1 text-[12px] leading-[1.35] font-medium underline underline-offset-2 transition-transform duration-100 ease-out active:scale-[0.97]';

  if (!hasAvailability) return null;
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
