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
    __albaswipeResetTutorial?: (userId?: string) => void;
  }
}

/**
 * v2부터 사용자별로 저장한다. 브라우저 공용 키 하나를 쓰면 같은 기기에서 새로 가입한
 * 계정도 이전 사용자가 튜토리얼을 봤다는 이유로 건너뛰는 버그가 생긴다.
 */
export const TUTORIAL_SEEN_KEY_PREFIX = 'albaswipe.tutorial.seen.v2';

const SEEN_VALUE = '1';

/** 이미 본 적이 있는가. 스토리지가 막혀 있으면 false로 두어 첫 안내를 잃지 않는다. */
export function tutorialSeenKey(userId: string): string {
  return `${TUTORIAL_SEEN_KEY_PREFIX}:${userId}`;
}

export function hasSeenTutorial(userId: string): boolean {
  try {
    return window.localStorage.getItem(tutorialSeenKey(userId)) === SEEN_VALUE;
  } catch {
    // 스토리지가 막혀도 첫 사용 안내 자체를 잃지 않는다. 닫힌 상태는 컴포넌트가
    // 현재 세션 동안 기억하므로 route 이동마다 반복해서 뜨지는 않는다.
    return false;
  }
}

/** 봤다고 표시한다. 실패해도 조용히 넘어간다 — 튜토리얼을 닫는 동작 자체는 성공해야 한다. */
export function markTutorialSeen(userId: string): void {
  try {
    window.localStorage.setItem(tutorialSeenKey(userId), SEEN_VALUE);
  } catch {
    /* 스토리지가 막힌 환경. 이번 세션에서만 닫힌다. */
  }
}

/**
 * 기록을 지운다. 다음 진입에서 튜토리얼이 다시 뜬다.
 * 데모 리허설에서 쓰려고 export 한다. 개발 빌드에서는 콘솔의
 * `__albaswipeResetTutorial()` 로도 호출할 수 있다 (Tutorial.tsx 에서 등록).
 */
export function resetTutorial(userId: string): void {
  try {
    window.localStorage.removeItem(tutorialSeenKey(userId));
  } catch {
    /* 무시 */
  }
}

/** 개발 리허설용. userId를 생략하면 v2 사용자 키만 모두 지운다. */
export function resetTutorialForDev(userId?: string): void {
  try {
    if (userId) {
      resetTutorial(userId);
      return;
    }
    for (let i = window.localStorage.length - 1; i >= 0; i -= 1) {
      const key = window.localStorage.key(i);
      if (key?.startsWith(`${TUTORIAL_SEEN_KEY_PREFIX}:`)) {
        window.localStorage.removeItem(key);
      }
    }
  } catch {
    /* 무시 */
  }
}
