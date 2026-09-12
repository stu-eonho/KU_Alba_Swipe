/**
 * OWNER: 개발자 B (screen-composer) — 단독 소유
 *
 * 온보딩 배럴. 라우터는 여기서만 가져온다.
 * 화면은 `Tutorial` 하나만 쓴다 — 인터랙티브/정보 카드 선택은 Tutorial.tsx 안에서 끝난다.
 */
export { Tutorial, TUTORIAL_INTERACTIVE } from './Tutorial';
export type { TutorialProps } from './Tutorial';

/** 폴백 전용. 화면에서 직접 쓰지 말 것 — Tutorial 이 알아서 갈아탄다. */
export { SlideTutorial } from './SlideTutorial';
export type { SlideTutorialProps } from './SlideTutorial';

export { InteractiveTutorial } from './InteractiveTutorial';
export type { InteractiveTutorialProps } from './InteractiveTutorial';

export { TUTORIAL_SLIDES } from './tutorialSlides';
export type { TutorialSlide } from './tutorialSlides';

/** PHASE7 F9 — 구인자용 단계/슬라이드. Tutorial 이 role 로 골라 쓴다. */
export { EMPLOYER_STEPS, EMPLOYER_SLIDES } from './employerSteps';

/** 덱이 스와이프를 확정할 때 호출한다(HomeDeckPage). 새 제스처 이벤트를 만들지 않는다. */
export {
  INTERACTIVE_STEPS,
  TUTORIAL_ACTIVE_EVENT,
  TUTORIAL_SWIPE_EVENT,
  TUTORIAL_WAIT_TIMEOUT_MS,
  emitTutorialActive,
  emitTutorialSwipe,
  isTutorialActive,
} from './tutorialSteps';
export type { TutorialStep, TutorialActiveDetail, TutorialSwipeDetail } from './tutorialSteps';

export {
  TUTORIAL_SEEN_KEY_ROOT,
  TUTORIAL_SEEN_KEY_PREFIX,
  tutorialSeenKey,
  hasSeenTutorial,
  markTutorialSeen,
  resetTutorial,
  resetTutorialForDev,
} from './tutorialStorage';
