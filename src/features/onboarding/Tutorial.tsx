/**
 * OWNER: 개발자 B (screen-composer) — 단독 소유
 *
 * 튜토리얼의 **유일한 진입점**. 라우터와 설정 화면은 이 컴포넌트만 쓴다.
 * 어느 튜토리얼을 보여줄지는 전부 여기서 정한다.
 *
 *   ① 인터랙티브 (PHASE6 B-3) — 반투명 스포트라이트 + 실제 스와이프 유도
 *   ② 정보 카드 4장 (PHASE2 B-4) — 예전 튜토리얼. **폴백으로 남겨 둔다**
 *
 * ▼▼▼ 킬 스위치 ▼▼▼
 *   TUTORIAL_INTERACTIVE 를 false 로 바꾸면 즉시 ②로 돌아간다.
 *   데모 직전에 인터랙티브가 이상하게 굴면 이 한 줄만 뒤집는다.
 * ▲▲▲▲▲▲▲▲▲▲▲▲▲▲
 *
 * 자동 폴백이 걸리는 경우(킬 스위치를 건드리지 않아도):
 *   - 홈 덱('/')이 아닌 화면 — 스포트라이트를 걸 덱이 없다(설정 > 튜토리얼 다시 보기 등)
 *   - InteractiveTutorial 이 렌더 중 던졌을 때 — SilentBoundary 가 잡고 ②로 갈아탄다
 *   - ②까지 던지면 그때는 아무것도 렌더하지 않는다. 첫 진입 화면이 흰 화면이 되면 안 된다.
 *
 * 완료 여부는 예전과 같은 localStorage 키(tutorialStorage.ts)로만 판단한다. DB를 쓰지 않는다.
 */
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { InteractiveTutorial } from './InteractiveTutorial';
import { SilentBoundary } from './SilentBoundary';
import { SlideTutorial } from './SlideTutorial';
import { hasSeenTutorial, markTutorialSeen, resetTutorialForDev } from './tutorialStorage';

/** ★ 킬 스위치 ★ false 로 두면 예전 정보 카드 4장 튜토리얼만 뜬다. */
export const TUTORIAL_INTERACTIVE = true;

/** 인터랙티브 튜토리얼이 의미 있는 화면. 덱이 없는 곳에서는 스포트라이트를 걸 데가 없다. */
const DECK_PATH = '/';

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
};

export function Tutorial({ userId, open, onClose }: TutorialProps) {
  const isControlled = open !== undefined;
  // 최초 렌더에서 한 번만 읽는다. 렌더마다 localStorage 를 때리지 않는다.
  const [selfOpen, setSelfOpen] = useState(() => !hasSeenTutorial(userId));
  const [interactiveFailed, setInteractiveFailed] = useState(false);
  const { pathname } = useLocation();
  /*
   * 덱 화면에서 시작했는지를 **마운트 시점에 한 번만** 고정한다.
   * 매 렌더 pathname 을 보면, 튜토리얼 도중 탭이 눌려 경로가 바뀐 순간 인터랙티브가
   * 정보 카드로 갈아타며 화면이 통째로 뒤집힌다. 시작한 튜토리얼은 끝까지 같은 모습이어야 한다.
   */
  const [startedOnDeck] = useState(() => pathname === DECK_PATH);

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
    markTutorialSeen(userId);
    if (!isControlled) setSelfOpen(false);
    onClose?.();
  };

  if (!visible) return null;

  const useInteractive = TUTORIAL_INTERACTIVE && !interactiveFailed && startedOnDeck;

  if (useInteractive) {
    return (
      <SilentBoundary onError={() => setInteractiveFailed(true)}>
        <InteractiveTutorial userId={userId} open onClose={handleClose} />
      </SilentBoundary>
    );
  }

  // 폴백. 여기서 또 던지면 아무것도 렌더하지 않는다(조용히 사라진다).
  return (
    <SilentBoundary>
      <SlideTutorial userId={userId} open onClose={handleClose} />
    </SilentBoundary>
  );
}
