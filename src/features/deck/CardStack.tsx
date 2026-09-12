/**
 * OWNER: 개발자 B (deck-interaction) — 단독 소유
 *
 * ALBASWIPE_SPEC.md <home_deck_view><card_stack> + <keyboard_shortcuts>
 *
 * 덱의 상태(현재 인덱스 / 날아가는 카드)를 소유하고, 드래그·버튼·키보드
 * 세 입력을 전부 commitSwipe() 한 함수로 모은다.
 *
 * DOM에는 카드를 3장만 유지한다. 날아가는 중인 카드는 그 위에 잠깐 얹힌다.
 * 렌더 배열을 [날아가는 카드, ...보이는 3장] 순서로 유지하면 카드가 승격될 때
 * key 위치가 그대로라 리마운트가 일어나지 않는다 (리마운트되면 transform이 튄다).
 *
 * CRITICAL: 낙관적 업데이트. 인덱스를 즉시 올리고 서버 호출은 뒤에서 보낸다.
 *           실패해도 카드를 되돌리지 않는다 — 이미 다음 카드를 보고 있다.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { useReducedMotion } from 'motion/react';
import { SearchX } from 'lucide-react';
import { EmptyState } from '@/components/ui';
import type { Job, SwipeDirection } from '@/types';
import { gridCardLayoutId } from '@/features/wishlist/GridCard';
import { SwipeCard } from './SwipeCard';
import { SwipeControls } from './SwipeControls';
import { FLY_MS, REDUCED_FADE_MS, STACK_DEPTH, swipeHaptic } from './useSwipeGesture';

/** 날아가기가 끝난 뒤 DOM에서 내리기까지의 여유. 애니메이션 끝과 겹치면 깜빡인다. */
const UNMOUNT_GRACE_MS = 60;
/** 미리 디코딩할 다음 카드 수 */
const PREFETCH_COUNT = 3;
/** aria-live는 직전과 같은 문자열이면 다시 읽지 않는다. 보이지 않는 문자로 텍스트를 바꾼다 */
const ZERO_WIDTH_SPACE = String.fromCharCode(0x200b);

type ExitingCard = { job: Job; direction: SwipeDirection };

export type CardStackProps = {
  jobs: Job[];
  /**
   * 스와이프가 확정된 직후 호출된다(낙관적 — 카드는 이미 날아갔다).
   * 여기서 실패해도 카드를 되돌리지 말 것.
   */
  onSwipe?: (job: Job, direction: SwipeDirection) => void;
  /** 맨 위 카드를 탭했을 때 — 상세 카드를 연다 */
  onCardTap?: (job: Job) => void;
  /**
   * 상세 카드가 열려 있는 공고 id.
   * 해당 카드는 빈 자리로 대체되고(= layoutId 주체를 상세 카드 하나로 고정),
   * 그 동안 키보드 단축키와 컨트롤 버튼이 잠긴다.
   */
  expandedJobId?: string | null;
  className?: string;
};

export function CardStack({
  jobs,
  onSwipe,
  onCardTap,
  expandedJobId = null,
  className,
}: CardStackProps) {
  const [exiting, setExiting] = useState<ExitingCard[]>([]);
  /** aria-live는 같은 문자열이 연속되면 다시 읽지 않는다. seq로 텍스트를 미세하게 바꾼다 */
  const [announcement, setAnnouncement] = useState<{ text: string; seq: number } | null>(null);

  const prefersReduced = useReducedMotion();
  const timersRef = useRef<number[]>([]);
  const prefetchedRef = useRef<Set<string>>(new Set());

  useEffect(
    () => () => {
      timersRef.current.forEach((id) => window.clearTimeout(id));
      timersRef.current = [];
    },
    [],
  );

  /**
   * CRITICAL: 이 컴포넌트는 index를 갖지 않는다. 스와이프한 공고는 부모(useDeck)가
   * 배열에서 빼고, 여기는 항상 앞에서 3장만 본다.
   *
   * 예전에는 index를 올리면서 동시에 부모가 배열을 줄여 한 프레임 동안 카드를 건너뛰었고,
   * jobs가 바뀔 때 exiting을 비우는 effect가 날아가는 애니메이션을 매번 잘라먹었다.
   * 상태를 한 곳(부모)에만 두면 두 문제가 함께 사라진다.
   */
  const visible = useMemo(() => jobs.slice(0, STACK_DEPTH), [jobs]);
  const exhausted = visible.length === 0;

  /** 부모가 아직 배열에서 빼기 전에 같은 카드가 두 번 스와이프되는 것을 막는다 */
  const exitingIds = useMemo(() => new Set(exiting.map((e) => e.job.id)), [exiting]);

  /** 드래그 · 버튼 · 키보드가 전부 이 함수를 호출한다. */
  const commitSwipe = useCallback(
    (direction: SwipeDirection) => {
      const job = jobs[0];
      if (!job) return;
      if (exitingIds.has(job.id)) return; // 부모 반영 전 연타 방지

      swipeHaptic();

      // 낙관적: 먼저 날린다. 응답도, 부모의 배열 갱신도 기다리지 않는다.
      setExiting((prev) => [{ job, direction }, ...prev]);
      setAnnouncement((prev) => ({
        text: direction === 'right' ? '찜했습니다' : '관심 없음으로 표시했습니다',
        seq: (prev?.seq ?? 0) + 1,
      }));

      onSwipe?.(job, direction);

      const flyMs = prefersReduced ? REDUCED_FADE_MS : FLY_MS;
      const timer = window.setTimeout(() => {
        setExiting((prev) => prev.filter((entry) => entry.job.id !== job.id));
      }, flyMs + UNMOUNT_GRACE_MS);
      timersRef.current.push(timer);
    },
    [exitingIds, jobs, onSwipe, prefersReduced],
  );

  // 키보드: ArrowLeft = 관심 없음, ArrowRight = 찜
  useEffect(() => {
    // 상세 카드가 열려 있으면 덱 단축키를 아예 달지 않는다.
    // ExpandedCard가 Escape를 capture 단계에서 먹는 것과 같은 목적 — 뒤에 있는
    // 덱이 조작되면 카드를 닫았을 때 다른 공고가 떠 있다.
    if (expandedJobId) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      // 입력 요소에 포커스가 있으면 캐럿 이동이 우선이다
      const active = document.activeElement;
      if (
        active instanceof HTMLElement &&
        (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)
      ) {
        return;
      }

      event.preventDefault();
      commitSwipe(event.key === 'ArrowRight' ? 'right' : 'left');
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [commitSwipe, expandedJobId]);

  // 다음 카드 이미지를 미리 디코딩한다. 넘긴 뒤 로드되면 데모에서 제일 티 난다.
  useEffect(() => {
    jobs.slice(1, 1 + PREFETCH_COUNT).forEach((job) => {
      if (!job.imageUrl) return;
      if (prefetchedRef.current.has(job.imageUrl)) return; // 연속 스와이프 시 중복 요청 방지
      prefetchedRef.current.add(job.imageUrl);
      const img = new Image();
      img.src = job.imageUrl;
    });
  }, [jobs]);

  const cards = [
    ...exiting.map((entry) => ({
      job: entry.job,
      depth: -1,
      direction: entry.direction as SwipeDirection | null,
    })),
    ...visible.map((job, i) => ({ job, depth: i, direction: null as SwipeDirection | null })),
  ];

  const showEmpty = exhausted && exiting.length === 0;
  const topJob = visible[0] ?? null;

  return (
    <div className={clsx('flex flex-col items-center', className)}>
      {/* 영역: width calc(100% - 32px), 최대 448px, aspect 3/4, 상단 마진 16px, 중앙 정렬 */}
      {/*
        data-tour="deck" — 인터랙티브 튜토리얼 스포트라이트 앵커 (PHASE6 B-3).
        CRITICAL: 앵커는 카드 개별이 아니라 이 **스택 영역**에 건다. 카드는 스와이프마다
        교체되므로 개별 카드에 걸면 앵커가 흔들린다. 이 상자는 비어 있어도 크기가 같다.
      */}
      <div
        data-tour="deck"
        className="relative mx-auto mt-4 aspect-[3/4] w-[calc(100%-32px)] max-w-[448px]"
      >
        {showEmpty ? (
          <div className="flex h-full items-center justify-center">
            <EmptyState
              icon={<SearchX size={56} className="text-faint" />}
              title="오늘 볼 공고를 다 봤어요!"
              description="찜한 공고를 비교해 보세요"
              actionLabel="찜 목록 보기"
              actionTo="/wishlist"
            />
          </div>
        ) : (
          cards.map((card, i) =>
            card.job.id === expandedJobId ? (
              /*
               * 상세 카드가 이 공고를 확대 중 — SwipeCard를 언마운트하고 자리만 남긴다.
               * CRITICAL: 같은 layoutId를 가진 요소가 동시에 둘 살아 있으면 motion이
               * 주체를 정하지 못해 카드가 다른 카드를 뚫고 나온다. opacity로 숨기는
               * 것만으로는 요소가 살아 있어 해결되지 않는다 (찜 격자와 같은 처리).
               * key와 배열 위치를 유지해 뒤 카드들의 depth는 그대로 둔다.
               */
              <div key={card.job.id} className="absolute inset-0" aria-hidden />
            ) : (
              <SwipeCard
                key={card.job.id}
                job={card.job}
                depth={card.depth}
                exitDirection={card.direction}
                onCommit={commitSwipe}
                onTap={() => onCardTap?.(card.job)}
                // 맨 위 카드만 상세 카드와 layoutId를 공유한다
                layoutId={card.depth === 0 ? gridCardLayoutId(card.job.id) : undefined}
                zIndex={cards.length - i}
              />
            ),
          )
        )}
      </div>

      {/*
        키보드·스크린리더용 상세 보기 진입점. 포인터 사용자는 카드를 탭한다.
        CardStack이 들고 있는 이유: 상세가 열리면 맨 위 SwipeCard가 언마운트되므로
        버튼이 카드 안에 있으면 닫은 뒤 포커스를 되돌릴 DOM 노드가 사라진다.
      */}
      {!showEmpty && topJob && (
        <button
          type="button"
          className="sr-only"
          onClick={() => onCardTap?.(topJob)}
          disabled={Boolean(expandedJobId)}
        >
          {topJob.storeName} 상세 보기
        </button>
      )}

      {!showEmpty && (
        <SwipeControls
          onNope={() => commitSwipe('left')}
          onLike={() => commitSwipe('right')}
          // 상세가 열려 있으면 백드롭에 가려 보이지도 않지만, 키보드로는 여전히
          // 닿을 수 있으므로 명시적으로 잠근다
          disabled={exhausted || Boolean(expandedJobId)}
        />
      )}

      <div aria-live="polite" className="sr-only">
        {announcement ? `${announcement.text}${ZERO_WIDTH_SPACE.repeat(announcement.seq % 2)}` : ''}
      </div>
    </div>
  );
}
