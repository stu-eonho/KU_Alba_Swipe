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
  className?: string;
};

export function CardStack({ jobs, onSwipe, className }: CardStackProps) {
  const [index, setIndex] = useState(0);
  const [exiting, setExiting] = useState<ExitingCard[]>([]);
  /** aria-live는 같은 문자열이 연속되면 다시 읽지 않는다. seq로 텍스트를 미세하게 바꾼다 */
  const [announcement, setAnnouncement] = useState<{ text: string; seq: number } | null>(null);

  const prefersReduced = useReducedMotion();
  const timersRef = useRef<number[]>([]);
  const prefetchedRef = useRef<Set<string>>(new Set());

  // 공고 목록이 통째로 바뀌면(=A의 useDeck 연결 시) 처음부터 다시 본다
  useEffect(() => {
    setIndex(0);
    setExiting([]);
  }, [jobs]);

  useEffect(
    () => () => {
      timersRef.current.forEach((id) => window.clearTimeout(id));
      timersRef.current = [];
    },
    [],
  );

  const visible = useMemo(() => jobs.slice(index, index + STACK_DEPTH), [jobs, index]);
  const exhausted = visible.length === 0;

  /** 드래그 · 버튼 · 키보드가 전부 이 함수를 호출한다. */
  const commitSwipe = useCallback(
    (direction: SwipeDirection) => {
      const job = jobs[index];
      if (!job) return;

      swipeHaptic();

      // 낙관적: 먼저 날리고 인덱스를 올린다. 응답을 기다리지 않는다.
      setExiting((prev) => [{ job, direction }, ...prev]);
      setIndex((i) => i + 1);
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
    [index, jobs, onSwipe, prefersReduced],
  );

  // 키보드: ArrowLeft = 관심 없음, ArrowRight = 찜
  useEffect(() => {
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
  }, [commitSwipe]);

  // 다음 카드 이미지를 미리 디코딩한다. 넘긴 뒤 로드되면 데모에서 제일 티 난다.
  useEffect(() => {
    jobs.slice(index + 1, index + 1 + PREFETCH_COUNT).forEach((job) => {
      if (!job.imageUrl) return;
      if (prefetchedRef.current.has(job.imageUrl)) return; // 연속 스와이프 시 중복 요청 방지
      prefetchedRef.current.add(job.imageUrl);
      const img = new Image();
      img.src = job.imageUrl;
    });
  }, [index, jobs]);

  const cards = [
    ...exiting.map((entry) => ({
      job: entry.job,
      depth: -1,
      direction: entry.direction as SwipeDirection | null,
    })),
    ...visible.map((job, i) => ({ job, depth: i, direction: null as SwipeDirection | null })),
  ];

  const showEmpty = exhausted && exiting.length === 0;

  return (
    <div className={clsx('flex flex-col items-center', className)}>
      {/* 영역: width calc(100% - 32px), 최대 448px, aspect 3/4, 상단 마진 16px, 중앙 정렬 */}
      <div className="relative mx-auto mt-4 aspect-[3/4] w-[calc(100%-32px)] max-w-[448px]">
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
          cards.map((card, i) => (
            <SwipeCard
              key={card.job.id}
              job={card.job}
              depth={card.depth}
              exitDirection={card.direction}
              onCommit={commitSwipe}
              zIndex={cards.length - i}
            />
          ))
        )}
      </div>

      {!showEmpty && (
        <SwipeControls
          onNope={() => commitSwipe('left')}
          onLike={() => commitSwipe('right')}
          disabled={exhausted}
        />
      )}

      <div aria-live="polite" className="sr-only">
        {announcement ? `${announcement.text}${ZERO_WIDTH_SPACE.repeat(announcement.seq % 2)}` : ''}
      </div>
    </div>
  );
}
