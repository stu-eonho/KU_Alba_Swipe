/**
 * OWNER: 개발자 B (ui-foundation) — 단독 소유
 *
 * ALBASWIPE_SPEC.md <global_layout><top_bar>
 *  높이 56px, 배경 surface, 하단 보더 1px line, sticky top 0, z-index 30.
 *  중앙에 화면 제목 (17px, 700, ink).
 *
 * left/right 슬롯은 44px 폭을 고정으로 차지한다 — 한쪽에만 버튼이 있어도
 * 제목이 중앙에서 밀리지 않는다.
 *
 * 홈 탭의 제목만 글자 대신 로고로 그린다. 라우터가 넘기는 문자열은 그대로 두고
 * 여기서 알아보는 이유: 제목은 `handle.title` 하나로만 오고, 페이지가
 * `useTopBarTitle('찜한 공고 8')`처럼 문자열로 덮어쓰기 때문에 ReactNode 를
 * 끝까지 흘려보낼 길이 없다. 대신 로고 이름을 한 곳(BRAND_TITLE)에만 둔다.
 */
import clsx from 'clsx';

export type TopBarProps = {
  title?: React.ReactNode;
  left?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
};

/** 이 제목이 오면 글자 대신 로고를 그린다. 라우터의 홈 라우트 handle.title 과 같아야 한다. */
export const BRAND_TITLE = 'AlbaSwipe';

export function TopBar({ title, left, right, className }: TopBarProps) {
  const isBrand = title === BRAND_TITLE;

  return (
    <header
      className={clsx(
        'bg-surface border-line sticky top-0 z-30 flex h-14 items-center border-b px-1',
        className,
      )}
    >
      <div className="flex w-11 shrink-0 items-center justify-start">{left}</div>
      <h1 className="text-ink flex flex-1 justify-center truncate px-1 text-center text-[16px] leading-[1.4] font-semibold">
        {isBrand ? (
          /* 높이를 고정하고 너비를 auto 로 둬야 로고 비율이 안 깨진다. 탑바는 56px. */
          <img src="/logo.png" alt={BRAND_TITLE} width={112} height={32} className="h-8 w-auto" />
        ) : (
          title
        )}
      </h1>
      <div className="flex w-11 shrink-0 items-center justify-end">{right}</div>
    </header>
  );
}
