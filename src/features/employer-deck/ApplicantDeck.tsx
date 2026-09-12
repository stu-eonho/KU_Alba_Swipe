/**
 * OWNER: 개발자 B (deck-interaction) — 단독 소유
 *
 * PHASE4_PLAN.md B-1 · 지원자 스와이프 덱
 * 사용자 요청: "구인자 탭에서도 똑같이 지원자가 있을 때 swipe해서 고를 수 있게"
 *
 * 왜 `CardStack`을 그대로 쓰지 않았나
 * ------------------------------------
 * `CardStack`은 `Job`에 강하게 묶여 있다: props가 `jobs: Job[]`, 카드가 `SwipeCard`,
 * `job.imageUrl` 프리페치, 찜 격자와 공유하는 `gridCardLayoutId`, 빈 상태 문구,
 * aria-live 문구("찜했습니다"), 컨트롤이 `SwipeControls`(원형 아이콘 2개)로 고정.
 * 제네릭으로 뜯으면 기능 동결 직전에 홈 덱을 깨뜨릴 위험이 크다.
 *
 * 그래서 **껍데기만 따로 세우고 제스처는 한 벌만 쓴다** — `useSwipeGesture`와
 * 스펙 상수(FLY_MS / STACK_DEPTH / swipeHaptic ...)를 `@/features/deck`에서 그대로
 * import 한다. 임계 거리·속도·회전·날아가기가 두 덱에서 영원히 같다.
 *
 * 데이터는 **prop으로 받는다.** 개발자 A의 `useApplicantDeck()`이 오면
 * 이 컴포넌트는 손대지 않고 페이지 한 줄만 바꾼다:
 *   <ApplicantDeck entries={applicants} onDecide={offer} />
 *
 * CRITICAL: 낙관적 업데이트. 카드는 즉시 날아가고 서버 호출은 뒤에서 보낸다.
 *           실패해도 되돌리지 않는다 — 이미 다음 지원자를 보고 있다.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { useReducedMotion } from 'motion/react';
import { UsersRound } from 'lucide-react';
import { EmptyState } from '@/components/ui';
import type { ApplicantEntry, SwipeDirection } from '@/types';
import { FLY_MS, REDUCED_FADE_MS, STACK_DEPTH, swipeHaptic } from '@/features/deck/useSwipeGesture';
import { ApplicantDeckCard } from './ApplicantDeckCard';
import { ApplicantSwipeControls } from './ApplicantSwipeControls';

/** 날아가기가 끝난 뒤 DOM에서 내리기까지의 여유. 애니메이션 끝과 겹치면 깜빡인다. */
const UNMOUNT_GRACE_MS = 60;
/** aria-live는 직전과 같은 문자열이면 다시 읽지 않는다. 보이지 않는 문자로 텍스트를 바꾼다 */
const ZERO_WIDTH_SPACE = String.fromCharCode(0x200b);

type ExitingCard = { entry: ApplicantEntry; direction: SwipeDirection };

export type ApplicantDeckProps = {
  /** 아직 판단하지 않은 지원자들. 맨 앞이 맨 위 카드다 */
  entries: ApplicantEntry[];
  /**
   * 스와이프가 확정된 직후 호출된다(낙관적 — 카드는 이미 날아갔다).
   *   direction 'right' = 관심 있어요 → 지원자에게 알림 발송
   *   direction 'left'  = 보류        → 삭제가 아니라 보류 목록으로 이동
   * 여기서 실패해도 카드를 되돌리지 말 것.
   */
  onDecide?: (seekerId: string, direction: SwipeDirection, jobId: string) => void;
  /** 빈 상태에서 누를 CTA 경로. 기본은 보류 탭 */
  emptyActionTo?: string;
  className?: string;
};

export function ApplicantDeck({
  entries,
  onDecide,
  emptyActionTo = '/employer/held',
  className,
}: ApplicantDeckProps) {
  const [exiting, setExiting] = useState<ExitingCard[]>([]);
  const [announcement, setAnnouncement] = useState<{ text: string; seq: number } | null>(null);

  const prefersReduced = useReducedMotion();
  const timersRef = useRef<number[]>([]);

  useEffect(
    () => () => {
      timersRef.current.forEach((id) => window.clearTimeout(id));
      timersRef.current = [];
    },
    [],
  );

  /**
   * CRITICAL: 이 컴포넌트는 index를 갖지 않는다. 판단이 끝난 지원자는 부모(훅)가
   * 배열에서 빼고, 여기는 항상 앞에서 3장만 본다. (CardStack과 같은 규칙)
   */
  const visible = useMemo(() => entries.slice(0, STACK_DEPTH), [entries]);
  const exhausted = visible.length === 0;

  /** 부모가 아직 배열에서 빼기 전에 같은 카드가 두 번 스와이프되는 것을 막는다 */
  const exitingIds = useMemo(() => new Set(exiting.map((e) => e.entry.id)), [exiting]);

  /** 드래그 · 버튼 · 키보드가 전부 이 함수를 호출한다. */
  const commitSwipe = useCallback(
    (direction: SwipeDirection) => {
      const entry = entries[0];
      if (!entry) return;
      if (exitingIds.has(entry.id)) return; // 부모 반영 전 연타 방지

      swipeHaptic();

      setExiting((prev) => [{ entry, direction }, ...prev]);
      setAnnouncement((prev) => ({
        text:
          direction === 'right'
            ? `${entry.seeker.nickname}님에게 관심을 보냈습니다`
            : `${entry.seeker.nickname}님을 보류했습니다`,
        seq: (prev?.seq ?? 0) + 1,
      }));

      onDecide?.(entry.seeker.id, direction, entry.job.id);

      const flyMs = prefersReduced ? REDUCED_FADE_MS : FLY_MS;
      const timer = window.setTimeout(() => {
        setExiting((prev) => prev.filter((item) => item.entry.id !== entry.id));
      }, flyMs + UNMOUNT_GRACE_MS);
      timersRef.current.push(timer);
    },
    [entries, exitingIds, onDecide, prefersReduced],
  );

  // 키보드: ArrowLeft = 보류, ArrowRight = 관심 있어요
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

  /* 렌더 배열을 [날아가는 카드, ...보이는 3장] 순서로 유지하면 카드가 승격될 때
     key 위치가 그대로라 리마운트가 일어나지 않는다 (리마운트되면 transform이 튄다). */
  const cards = [
    ...exiting.map((item) => ({
      entry: item.entry,
      depth: -1,
      direction: item.direction as SwipeDirection | null,
    })),
    ...visible.map((entry, i) => ({ entry, depth: i, direction: null as SwipeDirection | null })),
  ];

  const showEmpty = exhausted && exiting.length === 0;

  return (
    <div className={clsx('flex flex-col items-center', className)}>
      <div className="relative mx-auto mt-4 aspect-[3/4] w-[calc(100%-32px)] max-w-[448px]">
        {showEmpty ? (
          <div className="flex h-full items-center justify-center">
            <EmptyState
              icon={<UsersRound size={56} className="text-faint" aria-hidden />}
              title="지원자를 다 봤어요!"
              description="보류한 지원자를 다시 볼 수 있어요"
              actionLabel="보류 목록 보기"
              actionTo={emptyActionTo}
            />
          </div>
        ) : (
          cards.map((card, i) => (
            <ApplicantDeckCard
              key={card.entry.id}
              entry={card.entry}
              depth={card.depth}
              exitDirection={card.direction}
              onCommit={commitSwipe}
              zIndex={cards.length - i}
            />
          ))
        )}
      </div>

      {!showEmpty && (
        <ApplicantSwipeControls
          onHold={() => commitSwipe('left')}
          onInterested={() => commitSwipe('right')}
          disabled={exhausted}
        />
      )}

      <div aria-live="polite" className="sr-only">
        {announcement ? `${announcement.text}${ZERO_WIDTH_SPACE.repeat(announcement.seq % 2)}` : ''}
      </div>
    </div>
  );
}
