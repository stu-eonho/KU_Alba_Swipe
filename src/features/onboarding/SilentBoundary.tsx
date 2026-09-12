/**
 * OWNER: 개발자 B (screen-composer) — 단독 소유
 *
 * PHASE6_PLAN.md B-3 CRITICAL — 튜토리얼은 첫 진입 화면이다. 여기서 에러가 나면
 * 데모 전체가 죽는다. 그래서 폴백이 **아무것도 렌더하지 않는** 전용 바운더리를 둔다.
 *
 * `@/components/layout` 의 ErrorBoundary 를 쓰지 않는 이유: 그쪽 폴백은 "문제가
 * 발생했어요" 화면을 그린다. 첫 진입에서 그 화면이 뜨면 튜토리얼이 없는 것보다 나쁘다.
 *
 * onError 로 상위(Tutorial.tsx)가 정보 카드 4장 튜토리얼로 갈아탈 수 있다.
 * 정보 카드 쪽이 또 던지면 그때는 정말로 아무것도 렌더하지 않는다.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  /** 처음 던졌을 때 한 번 호출된다. 상위가 폴백 모드로 전환하는 데 쓴다. */
  onError?: (error: Error) => void;
};

type State = { failed: boolean };

export class SilentBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Tutorial]', error, info.componentStack);
    try {
      this.props.onError?.(error);
    } catch {
      /* 상위 콜백이 또 던져도 여기서 끝낸다 */
    }
  }

  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}
