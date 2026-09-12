/**
 * OWNER: 개발자 B (screen-composer) — 단독 소유
 *
 * 튜토리얼의 **유일한 진입점**. 라우터와 설정 화면은 이 컴포넌트만 쓴다.
 * 어느 튜토리얼을 보여줄지는 전부 여기서 정한다.
 *
 *   ① 인터랙티브 (PHASE6 B-3) — 반투명 스포트라이트 + 실제 스와이프 유도
 *   ② 정보 카드 4장 (PHASE2 B-4) — 예전 튜토리얼. **폴백으로 남겨 둔다**
 *
 * PHASE7 F9 — **역할 분기.** 엔진(스포트라이트 · useAnchorRect · SilentBoundary ·
 * 킬 스위치)은 한 벌 그대로 쓰고 **단계 배열만 갈아끼운다.**
 *
 *   구직자  role 'seeker'   · 인터랙티브 화면 '/'                    · INTERACTIVE_STEPS
 *   구인자  role 'employer' · 인터랙티브 화면 '/employer/applicants' · EMPLOYER_STEPS
 *
 * 그 밖의 화면에서는 슬라이드 폴백으로 가되 **역할에 맞는 문구**로 간다. 구인자에게
 * "오른쪽으로 넘기면 찜"이 뜨면 튜토리얼이 없느니만 못하다.
 *
 * ▼▼▼ 킬 스위치 ▼▼▼
 *   TUTORIAL_INTERACTIVE 를 false 로 바꾸면 즉시 ②로 돌아간다(두 역할 모두).
 *   데모 직전에 인터랙티브가 이상하게 굴면 이 한 줄만 뒤집는다.
 * ▲▲▲▲▲▲▲▲▲▲▲▲▲▲
 *
 * 자동 폴백이 걸리는 경우(킬 스위치를 건드리지 않아도):
 *   - 그 역할의 덱 화면이 아닌 곳 — 스포트라이트를 걸 덱이 없다(설정 > 튜토리얼 다시 보기 등)
 *   - InteractiveTutorial 이 렌더 중 던졌을 때 — SilentBoundary 가 잡고 ②로 갈아탄다
 *   - 단계 배열 자체가 이상할 때 — 구직자 기본값으로 되돌린다(아래 pickSteps)
 *   - ②까지 던지면 그때는 아무것도 렌더하지 않는다. 첫 진입 화면이 흰 화면이 되면 안 된다.
 *
 * 완료 여부는 localStorage 로만 판단한다(tutorialStorage.ts). DB를 쓰지 않는다.
 * PHASE7 F9 부터 키가 **역할별로 나뉜다** — 한 사람이 두 역할 계정을 쓰는 데모에서
 * 한쪽을 봤다고 다른 쪽이 안 뜨면 안 된다.
 */
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import type { UserRole } from '@/types';
import { EMPLOYER_SLIDES, EMPLOYER_STEPS } from './employerSteps';
import { InteractiveTutorial } from './InteractiveTutorial';
import { SilentBoundary } from './SilentBoundary';
import { SlideTutorial } from './SlideTutorial';
import { INTERACTIVE_STEPS, type TutorialStep } from './tutorialSteps';
import { TUTORIAL_SLIDES, type TutorialSlide } from './tutorialSlides';
import { hasSeenTutorial, markTutorialSeen, resetTutorialForDev } from './tutorialStorage';

/** ★ 킬 스위치 ★ false 로 두면 예전 정보 카드 튜토리얼만 뜬다(두 역할 모두). */
export const TUTORIAL_INTERACTIVE = true;

/** 인터랙티브 튜토리얼이 의미 있는 화면. 덱이 없는 곳에서는 스포트라이트를 걸 데가 없다. */
const DECK_PATH: Readonly<Record<UserRole, string>> = {
  seeker: '/',
  employer: '/employer/applicants',
};

/** '/employer/applicants/' 처럼 슬래시가 붙어 와도 같은 화면으로 본다. */
function samePath(a: string, b: string): boolean {
  const trim = (p: string) => (p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p);
  return trim(a) === trim(b);
}

/**
 * 역할별 단계·슬라이드. 배열이 비었거나 읽다가 던지면 **구직자 기본값**으로 되돌린다.
 * 구인자 쪽이 깨져도 구직자 튜토리얼은 멀쩡해야 한다(CRITICAL).
 */
function pickContent(role: UserRole): {
  steps: readonly TutorialStep[];
  slides: readonly TutorialSlide[];
} {
  try {
    if (role === 'employer') {
      return {
        steps: EMPLOYER_STEPS.length > 0 ? EMPLOYER_STEPS : INTERACTIVE_STEPS,
        slides: EMPLOYER_SLIDES.length > 0 ? EMPLOYER_SLIDES : TUTORIAL_SLIDES,
      };
    }
  } catch {
    /* 아래 기본값으로 떨어진다 */
  }
  return { steps: INTERACTIVE_STEPS, slides: TUTORIAL_SLIDES };
}

export type TutorialProps = {
  /** 튜토리얼 완료 상태는 브라우저가 아니라 로그인 사용자별로 저장한다. */
  userId: string;
  /**
   * 생략하면 localStorage 로 스스로 판단한다(기본 사용법 — 라우터에서 `<Tutorial />`).
   * 값을 주면 제어 컴포넌트가 된다. 설정의 "튜토리얼 다시 보기" 같은 데서 쓴다.
   */
  open?: boolean;
  /** 건너뛰기 · 시작하기 · Escape 로 닫힐 때 호출된다. 닫기 전에 항상 "봤음"을 기록한다. */
  onClose?: () => void;
  /**
   * 역할을 직접 지정한다. 생략하면 로그인 사용자의 역할을 쓴다(기본 사용법).
   * 라우터 호출부는 손댈 필요가 없다.
   */
  role?: UserRole;
};

export function Tutorial({ userId, open, onClose, role: roleProp }: TutorialProps) {
  const { user } = useAuth();
  const role: UserRole = roleProp ?? (user?.role === 'employer' ? 'employer' : 'seeker');

  const isControlled = open !== undefined;
  // 최초 렌더에서 한 번만 읽는다. 렌더마다 localStorage 를 때리지 않는다.
  const [selfOpen, setSelfOpen] = useState(() => !hasSeenTutorial(userId, role));
  const [interactiveFailed, setInteractiveFailed] = useState(false);
  const { pathname } = useLocation();
  /*
   * 그 역할의 덱 화면에서 시작했는지를 **마운트 시점에 한 번만** 고정한다.
   * 매 렌더 pathname 을 보면, 튜토리얼 도중 탭이 눌려 경로가 바뀐 순간 인터랙티브가
   * 정보 카드로 갈아타며 화면이 통째로 뒤집힌다. 시작한 튜토리얼은 끝까지 같은 모습이어야 한다.
   */
  const [startedOnDeck] = useState(() => samePath(pathname, DECK_PATH[role] ?? DECK_PATH.seeker));

  const visible = isControlled ? open : selfOpen;

  /** 데모 리허설용: 개발 빌드에서 콘솔에 `__albaswipeResetTutorial()` 을 노출한다. */
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    window.__albaswipeResetTutorial = resetTutorialForDev;
    return () => {
      delete window.__albaswipeResetTutorial;
    };
  }, []);

  const handleClose = () => {
    markTutorialSeen(userId, role);
    if (!isControlled) setSelfOpen(false);
    onClose?.();
  };

  if (!visible) return null;

  const { steps, slides } = pickContent(role);
  const useInteractive = TUTORIAL_INTERACTIVE && !interactiveFailed && startedOnDeck;

  if (useInteractive) {
    return (
      <SilentBoundary onError={() => setInteractiveFailed(true)}>
        <InteractiveTutorial userId={userId} role={role} steps={steps} open onClose={handleClose} />
      </SilentBoundary>
    );
  }

  // 폴백. 여기서 또 던지면 아무것도 렌더하지 않는다(조용히 사라진다).
  return (
    <SilentBoundary>
      <SlideTutorial userId={userId} role={role} slides={slides} open onClose={handleClose} />
    </SilentBoundary>
  );
}
