/**
 * OWNER: 개발자 B (screen-composer) — 단독 소유
 *
 * PHASE6_PLAN.md B-3 · 인터랙티브 튜토리얼의 단계 정의와 스와이프 신호.
 *
 * 앵커는 `data-tour="..."` 속성 값이다. 대상은 세 곳뿐이다:
 *   deck          — CardStack 의 카드 스택 영역 **전체**(카드 개별이 아니다).
 *                   카드는 스와이프할 때마다 교체되므로 개별 카드를 잡으면 앵커가 흔들린다.
 *   controls      — SwipeControls 의 버튼 행
 *   tab-wishlist  — BottomTabBar 의 찜 탭
 *
 * 앵커를 못 찾거나 크기가 0이면 스포트라이트 없이 설명 카드만 띄운다(useAnchorRect).
 */
import type { SwipeDirection } from '@/types';

/**
 * 덱이 스와이프를 확정할 때 window 로 띄우는 신호.
 *
 * 새 제스처 이벤트를 만들지 않는다 — HomeDeckPage 가 이미 받고 있는 CardStack 의
 * onSwipe 안에서 이 이벤트 하나만 더 쏜다. useSwipeGesture 는 손대지 않는다.
 */
export const TUTORIAL_SWIPE_EVENT = 'albaswipe:tutorial-swipe';

/** 튜토리얼이 떠 있는 동안 카드 탭(상세 열기)을 막기 위한 신호. */
export const TUTORIAL_ACTIVE_EVENT = 'albaswipe:tutorial-active';

export type TutorialSwipeDetail = { direction: SwipeDirection };
export type TutorialActiveDetail = { active: boolean };

/** 덱에서 호출한다. 실패해도 스와이프 자체는 성공해야 하므로 전부 삼킨다. */
export function emitTutorialSwipe(direction: SwipeDirection): void {
  try {
    window.dispatchEvent(
      new CustomEvent<TutorialSwipeDetail>(TUTORIAL_SWIPE_EVENT, { detail: { direction } }),
    );
  } catch {
    /* CustomEvent 미지원 환경 — 튜토리얼은 8초 뒤 "다음"으로 빠져나간다 */
  }
}

/** 튜토리얼이 마운트/언마운트될 때 호출한다. */
export function emitTutorialActive(active: boolean): void {
  try {
    window.dispatchEvent(
      new CustomEvent<TutorialActiveDetail>(TUTORIAL_ACTIVE_EVENT, { detail: { active } }),
    );
  } catch {
    /* 무시 — 막지 못해도 앱은 정상 동작한다 */
  }
}

export type TutorialStep = {
  id: string;
  /** data-tour 값. null 이면 스포트라이트 없이 화면 중앙에 설명만 띄운다. */
  anchor: string | null;
  title: string;
  body: string;
  /**
   * 이 방향으로 실제 스와이프할 때까지 기다린다.
   * 기다리는 동안 "다음"을 감추되, TUTORIAL_WAIT_TIMEOUT_MS 안에 스와이프가 없으면
   * 다시 노출한다 — 막히면 안 된다.
   */
  waitFor?: SwipeDirection;
  /** 스포트라이트가 앵커 바깥으로 더 뚫는 여백(px) */
  padding?: number;
  /** 뚫린 사각형의 모서리 반경(px) */
  radius?: number;
};

/** 기다리는 단계에서 "다음" 버튼이 나타나기까지의 시간. */
export const TUTORIAL_WAIT_TIMEOUT_MS = 8000;

export const INTERACTIVE_STEPS: readonly TutorialStep[] = [
  {
    id: 'card',
    anchor: 'deck',
    title: '공고 한 장이 카드 한 장이에요',
    body: '가게 사진 · 시급 · 위치가 한 장에 담겨 있어요.\n카드를 탭하면 상세 정보가 열립니다.',
    padding: 6,
    radius: 14,
  },
  {
    id: 'swipe-right',
    anchor: 'deck',
    title: '마음에 들면 오른쪽으로',
    body: '카드를 오른쪽으로 밀어보세요.\n찜 목록에 바로 담깁니다.',
    waitFor: 'right',
    padding: 6,
    radius: 14,
  },
  {
    id: 'swipe-left',
    anchor: 'deck',
    title: '아니면 왼쪽으로',
    body: '조건이 안 맞으면 왼쪽으로 미세요.\n다음 공고가 곧바로 올라옵니다.',
    waitFor: 'left',
    padding: 6,
    radius: 14,
  },
  {
    id: 'controls',
    anchor: 'controls',
    title: '버튼으로도 됩니다',
    body: '한 손으로 밀기 어렵다면\n아래 두 버튼을 눌러도 똑같아요.',
    padding: 10,
    radius: 40,
  },
  {
    id: 'wishlist',
    anchor: 'tab-wishlist',
    title: '찜한 공고는 여기서',
    body: '찜한 공고는 이 탭에서\n4개씩 나란히 놓고 비교해요.',
    padding: 4,
    radius: 12,
  },
  {
    id: 'done',
    anchor: null,
    title: '준비 끝!',
    body: '이제 직접 넘겨보며\n마음에 드는 공고를 찾아보세요.',
  },
] as const;
