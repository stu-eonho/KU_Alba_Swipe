/**
 * OWNER: 개발자 B
 *
 * ALBASWIPE_SPEC.md <error_handling><error_boundary>
 *
 * 루트에 1개, 홈 덱에 1개를 건다.
 *
 * 덱에 따로 두는 이유: 카드 렌더 오류가 앱 전체를 흰 화면으로 만들면 데모가 거기서 끝난다.
 * 덱만 폴백으로 바꾸고 탭바는 살려 두면, 심사 중 덱이 죽어도 찜 목록으로 넘어가 계속 보여줄 수 있다.
 *
 * React 19에도 함수형 에러 바운더리 API는 없다. 클래스 컴포넌트가 유일한 방법이다.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui';

type Props = {
  children: ReactNode;
  /** 덱처럼 화면 일부만 감쌀 때 true. 전체 높이를 차지하지 않는다. */
  inline?: boolean;
  /** 폴백에서 "다시 시도"를 눌렀을 때. 미지정이면 새로고침한다. */
  onReset?: () => void;
};

type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // 프로덕션에서는 사용자에게 스택을 노출하지 않는다. 콘솔에만 남긴다.
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  private handleReset = () => {
    if (this.props.onReset) {
      this.setState({ error: null });
      this.props.onReset();
      return;
    }
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const { inline } = this.props;

    return (
      <div
        role="alert"
        className={
          inline
            ? 'flex flex-col items-center justify-center gap-3 px-6 py-12 text-center'
            : 'flex min-h-[60dvh] flex-col items-center justify-center gap-3 px-6 text-center'
        }
      >
        <AlertTriangle size={56} strokeWidth={1.75} className="text-nope" aria-hidden />
        <p className="text-[18px] font-semibold text-ink">문제가 발생했어요</p>
        <p className="text-[14px] text-muted">잠시 후 다시 시도해 주세요</p>

        <div className="mt-2">
          <Button variant="primary" size="md" onClick={this.handleReset}>
            {this.props.onReset ? '다시 시도' : '새로고침'}
          </Button>
        </div>

        {import.meta.env.DEV && (
          <details className="mt-4 max-w-full text-left">
            <summary className="cursor-pointer text-[12px] text-faint">
              개발자용 오류 상세 (개발 모드에서만 보임)
            </summary>
            <pre className="mt-2 max-h-48 overflow-auto rounded-[8px] bg-subtle p-3 text-[11px] text-body">
              {error.message}
              {'\n\n'}
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    );
  }
}
