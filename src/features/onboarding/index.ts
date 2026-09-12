/**
 * OWNER: 개발자 B (screen-composer) — 단독 소유
 *
 * 온보딩 배럴. 라우터는 여기서만 가져온다.
 */
export { Tutorial } from './Tutorial';
export type { TutorialProps } from './Tutorial';

export { TUTORIAL_SLIDES } from './tutorialSlides';
export type { TutorialSlide } from './tutorialSlides';

export {
  TUTORIAL_SEEN_KEY_PREFIX,
  tutorialSeenKey,
  hasSeenTutorial,
  markTutorialSeen,
  resetTutorial,
  resetTutorialForDev,
} from './tutorialStorage';
