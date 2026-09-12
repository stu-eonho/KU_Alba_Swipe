/**
 * OWNER: 개발자 B (screen-composer) — 단독 소유
 *
 * PHASE2_PLAN.md B-4 · F6 튜토리얼
 *
 * 첫 가입자 튜토리얼을 봤는지 여부만 보관한다. **DB를 쓰지 않는다** —
 * 개발자 A의 작업이 0이 되고, 데모 리허설에서 초기화하기도 쉽다.
 *
 * 시크릿 모드 · 서드파티 스토리지 차단 · 용량 초과 환경에서는 localStorage
 * 접근 자체가 throw 한다. 읽기/쓰기를 전부 try/catch 로 감싸고,
 * 읽기에 실패하면 "이미 봤다"로 취급한다. 매 진입마다 튜토리얼이 뜨는 것보다
 * 한 번도 안 뜨는 쪽이 낫다.
 */

declare global {
  interface Window {
    /** 개발 빌드에서만 등록된다(Tutorial.tsx). 콘솔에서 튜토리얼을 되돌릴 때 쓴다. */
    __albaswipeResetTutorial?: () => void;
  }
}

/** 데모 리허설에서 초기화할 키. 콘솔: localStorage.removeItem('albaswipe.tutorial.seen') */
export const TUTORIAL_SEEN_KEY = 'albaswipe.tutorial.seen';

const SEEN_VALUE = '1';

/** 이미 본 적이 있는가. 스토리지가 막혀 있으면 true(= 띄우지 않음). */
export function hasSeenTutorial(): boolean {
  try {
    return window.localStorage.getItem(TUTORIAL_SEEN_KEY) === SEEN_VALUE;
  } catch {
    return true;
  }
}

/** 봤다고 표시한다. 실패해도 조용히 넘어간다 — 튜토리얼을 닫는 동작 자체는 성공해야 한다. */
export function markTutorialSeen(): void {
  try {
    window.localStorage.setItem(TUTORIAL_SEEN_KEY, SEEN_VALUE);
  } catch {
    /* 스토리지가 막힌 환경. 이번 세션에서만 닫힌다. */
  }
}

/**
 * 기록을 지운다. 다음 진입에서 튜토리얼이 다시 뜬다.
 * 데모 리허설에서 쓰려고 export 한다. 개발 빌드에서는 콘솔의
 * `__albaswipeResetTutorial()` 로도 호출할 수 있다 (Tutorial.tsx 에서 등록).
 */
export function resetTutorial(): void {
  try {
    window.localStorage.removeItem(TUTORIAL_SEEN_KEY);
  } catch {
    /* 무시 */
  }
}
