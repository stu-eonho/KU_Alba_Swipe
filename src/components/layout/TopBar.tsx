/**
 * OWNER: 개발자 B (ui-foundation) — 단독 소유
 *
 * ALBASWIPE_SPEC.md <global_layout><top_bar>
 *  높이 56px, 배경 surface, 하단 보더 1px line, sticky top 0, z-index 30.
 *  중앙에 화면 제목 (17px, 700, ink).
 *
 * left/right 슬롯은 44px 폭을 고정으로 차지한다 — 한쪽에만 버튼이 있어도
 * 제목이 중앙에서 밀리지 않는다.
 */
import clsx from 'clsx';

export type TopBarProps = {
  title?: React.ReactNode;
  left?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
};

export function TopBar({ title, left, right, className }: TopBarProps) {
  return (
    <header
      className={clsx(
        'bg-surface border-line sticky top-0 z-30 flex h-14 items-center border-b px-1',
        className,
      )}
    >
      <div className="flex w-11 shrink-0 items-center justify-start">{left}</div>
      <h1 className="text-ink flex-1 truncate px-1 text-center text-[17px] leading-[1.4] font-bold">
        {title}
      </h1>
      <div className="flex w-11 shrink-0 items-center justify-end">{right}</div>
    </header>
  );
}
