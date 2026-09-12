/**
 * OWNER: 개발자 B (screen-composer) — 단독 소유
 *
 * PHASE2_PLAN.md B-4 · F6 튜토리얼 → PHASE7 F9 역할별 튜토리얼
 *
 * 튜토리얼을 봤는지 여부만 보관한다. **DB를 쓰지 않는다** —
 * 개발자 A의 작업이 0이 되고, 데모 리허설에서 초기화하기도 쉽다.
 *
 * PHASE7 F9 — 키를 **역할별로 나눈다.**
 *   albaswipe.tutorial.seen.seeker:<userId>
 *   albaswipe.tutorial.seen.employer:<userId>
 * 데모에서 한 사람이 두 역할 계정을 번갈아 쓴다. 구직자 튜토리얼을 봤다는 이유로
 * 구인자 튜토리얼이 안 뜨면 구인자 첫 화면 안내가 통째로 사라진다.
 *
 * userId 를 붙이는 이유는 그대로다(v2에서 도입): 브라우저 공용 키 하나를 쓰면 같은
 * 기기에서 새로 가입한 계정도 이전 사용자가 봤다는 이유로 건너뛴다.
 *
 * 마이그레이션: 예전 키(v2 사용자별 · v1 브라우저 공용)가 남아 있으면 **구직자 키로**
 * 옮긴다. 이미 튜토리얼을 본 사람에게 다시 뜨면 성가시다. 구인자 키는 만들지 않는다 —
 * 구인자 튜토리얼은 이번에 처음 생겼으므로 아무도 본 적이 없다.
 *
 * 시크릿 모드 · 서드파티 스토리지 차단 · 용량 초과 환경에서는 localStorage 접근 자체가
 * throw 한다. 읽기/쓰기를 전부 try/catch 로 감싼다.
 */
import type { UserRole } from '@/types';

declare global {
  interface Window {
    /** 개발 빌드에서만 등록된다(Tutorial.tsx). 콘솔에서 튜토리얼을 되돌릴 때 쓴다. */
    __albaswipeResetTutorial?: (userId?: string) => void;
  }
}

/** 튜토리얼 키의 공통 앞부분. resetTutorialForDev 가 이걸로 싹 지운다. */
export const TUTORIAL_SEEN_KEY_ROOT = 'albaswipe.tutorial.seen';

/** 역할별 키 앞부분. PHASE7 F9. */
export const TUTORIAL_SEEN_KEY_PREFIX: Readonly<Record<UserRole, string>> = {
  seeker: `${TUTORIAL_SEEN_KEY_ROOT}.seeker`,
  employer: `${TUTORIAL_SEEN_KEY_ROOT}.employer`,
};

/** PHASE6까지 쓰던 사용자별 키. 구직자 키로 한 번만 옮긴다. */
const LEGACY_V2_PREFIX = `${TUTORIAL_SEEN_KEY_ROOT}.v2`;
/** 그보다 더 예전의 브라우저 공용 키. 같은 이유로 구직자 키로 옮긴다. */
const LEGACY_V1_KEY = TUTORIAL_SEEN_KEY_ROOT;

const SEEN_VALUE = '1';

/** 저장 키. 역할을 생략하면 구직자다(예전 호출부 호환). */
export function tutorialSeenKey(userId: string, role: UserRole = 'seeker'): string {
  const prefix = TUTORIAL_SEEN_KEY_PREFIX[role] ?? TUTORIAL_SEEN_KEY_PREFIX.seeker;
  return `${prefix}:${userId}`;
}

/**
 * 예전 키 → 구직자 키. 한 번 옮기면 예전 키는 지운다.
 * 새 키가 이미 있으면 아무것도 하지 않는다(새 기록이 이긴다).
 * 실패는 전부 삼킨다 — 마이그레이션이 안 되면 튜토리얼이 한 번 더 뜰 뿐이다.
 */
function migrateLegacySeen(userId: string): void {
  try {
    const target = tutorialSeenKey(userId, 'seeker');
    const storage = window.localStorage;
    const legacyKeys = [`${LEGACY_V2_PREFIX}:${userId}`, LEGACY_V1_KEY];

    for (const legacyKey of legacyKeys) {
      const legacyValue = storage.getItem(legacyKey);
      if (legacyValue === null) continue;
      if (storage.getItem(target) === null) storage.setItem(target, SEEN_VALUE);
      storage.removeItem(legacyKey);
    }
  } catch {
    /* 스토리지가 막힌 환경 — 무시 */
  }
}

/** 이미 본 적이 있는가. 스토리지가 막혀 있으면 false로 두어 첫 안내를 잃지 않는다. */
export function hasSeenTutorial(userId: string, role: UserRole = 'seeker'): boolean {
  try {
    // 읽기 직전에 한 번 옮긴다. 이미 옮겼으면 예전 키가 없어 즉시 빠져나온다.
    if (role === 'seeker') migrateLegacySeen(userId);
    return window.localStorage.getItem(tutorialSeenKey(userId, role)) === SEEN_VALUE;
  } catch {
    // 스토리지가 막혀도 첫 사용 안내 자체를 잃지 않는다. 닫힌 상태는 컴포넌트가
    // 현재 세션 동안 기억하므로 route 이동마다 반복해서 뜨지는 않는다.
    return false;
  }
}

/** 봤다고 표시한다. 실패해도 조용히 넘어간다 — 튜토리얼을 닫는 동작 자체는 성공해야 한다. */
export function markTutorialSeen(userId: string, role: UserRole = 'seeker'): void {
  try {
    window.localStorage.setItem(tutorialSeenKey(userId, role), SEEN_VALUE);
  } catch {
    /* 스토리지가 막힌 환경. 이번 세션에서만 닫힌다. */
  }
}

/**
 * 기록을 지운다. 다음 진입에서 튜토리얼이 다시 뜬다.
 *
 * PHASE7 F9 — **두 역할 키를 모두** 지운다. 설정의 "튜토리얼 다시 보기"와 데모 리허설이
 * 부르는데, 역할을 골라 지우게 하면 리허설에서 한쪽이 남아 안 뜨는 사고가 난다.
 * 예전 키도 같이 정리한다.
 */
export function resetTutorial(userId: string): void {
  try {
    const storage = window.localStorage;
    storage.removeItem(tutorialSeenKey(userId, 'seeker'));
    storage.removeItem(tutorialSeenKey(userId, 'employer'));
    storage.removeItem(`${LEGACY_V2_PREFIX}:${userId}`);
    storage.removeItem(LEGACY_V1_KEY);
  } catch {
    /* 무시 */
  }
}

/** 개발 리허설용. userId를 생략하면 이 브라우저의 튜토리얼 기록을 전부 지운다. */
export function resetTutorialForDev(userId?: string): void {
  try {
    if (userId) {
      resetTutorial(userId);
      return;
    }
    for (let i = window.localStorage.length - 1; i >= 0; i -= 1) {
      const key = window.localStorage.key(i);
      if (key?.startsWith(TUTORIAL_SEEN_KEY_ROOT)) {
        window.localStorage.removeItem(key);
      }
    }
  } catch {
    /* 무시 */
  }
}
