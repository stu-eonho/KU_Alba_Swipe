/**
 * OWNER: 개발자 B (ui-foundation) — 단독 소유
 *
 * 회원가입 1/3 · 2/3 · 3/3 진행 표시.
 *
 * Blind 레퍼런스(DESIGN_Swipe.md) 톤:
 *  - 4px 바, 트랙 bg-line-soft, 채움 bg-brand
 *  - 전환 200ms --ease-standard, 오버슈트 없음
 *  - 카운터는 12px text-faint (강조하지 않는다 — 주인공은 폼이다)
 *
 * CRITICAL: width가 아니라 scaleX를 애니메이션한다.
 *  width 전환은 매 프레임 레이아웃을 유발해 폼 입력 중 프레임을 떨군다.
 *  transform-origin: left(= origin-left)로 왼쪽에서 자라게 한다.
 */
import clsx from 'clsx';

export type StepProgressProps = {
  /** 1부터 시작 */
  current: number;
  total: number;
  className?: string;
};

export function StepProgress({ current, total, className }: StepProgressProps) {
  // 잘못된 값이 와도 바가 깨지지 않게 방어한다 (0 나눗셈·음수·초과)
  const safeTotal = Math.max(1, Math.floor(total));
  const safeCurrent = Math.min(Math.max(Math.floor(current), 0), safeTotal);
  const ratio = safeCurrent / safeTotal;

  return (
    <div className={clsx('w-full', className)}>
      <div
        role="progressbar"
        aria-valuenow={safeCurrent}
        aria-valuemin={0}
        aria-valuemax={safeTotal}
        aria-label={`전체 ${safeTotal}단계 중 ${safeCurrent}단계`}
        className="bg-line-soft rounded-pill h-1 w-full overflow-hidden"
      >
        <div
          className="bg-brand ease-standard h-full w-full origin-left transition-transform duration-200"
          style={{ transform: `scaleX(${ratio})` }}
        />
      </div>
      <p className="text-faint tabular mt-1.5 text-right text-[12px] leading-[1.3]">
        {safeCurrent} / {safeTotal}
      </p>
    </div>
  );
}
