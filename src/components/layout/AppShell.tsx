/**
 * OWNER: 개발자 B (ui-foundation) — 단독 소유
 *
 * ALBASWIPE_SPEC.md <global_layout><container> + <component_hierarchy><app_shell>
 *  max-width 480px, margin 0 auto, 배경 app, 바깥 outside, 최소 높이 100dvh.
 *
 * 라우터의 레이아웃 라우트(PublicLayout / MainLayout / FullscreenLayout)가 이걸 쓴다.
 * 페이지는 보통 직접 쓸 필요가 없다.
 *
 * 화면 제목을 데이터에 따라 바꾸고 싶으면(예: "찜한 공고 8") 페이지 안에서
 * `useTopBarTitle('찜한 공고 8')`을 호출한다. 언마운트되면 라우트 기본 제목으로 돌아간다.
 */
import { createContext, useContext, useEffect, useState } from 'react';
import clsx from 'clsx';
import type { UserRole } from '@/types';
import { TopBar } from './TopBar';
import { BottomTabBar } from './BottomTabBar';

type SetTitle = (title: string | null) => void;
const TopBarTitleContext = createContext<SetTitle>(() => {});

/** 페이지에서 탑바 제목을 덮어쓴다. 문자열만 넘긴다(렌더 루프 방지). */
export function useTopBarTitle(title: string | null) {
  const setTitle = useContext(TopBarTitleContext);
  useEffect(() => {
    setTitle(title);
    return () => setTitle(null);
  }, [title, setTitle]);
}

export type AppShellProps = {
  children: React.ReactNode;
  /** 탑바 제목. showTopBar가 true일 때만 쓰인다. */
  title?: string;
  showTopBar?: boolean;
  showTabBar?: boolean;
  topBarLeft?: React.ReactNode;
  topBarRight?: React.ReactNode;
  /** 찜 탭 배지 숫자 */
  wishlistCount?: number;
  /** 하단 탭 구성을 결정하는 현재 사용자 역할 */
  role?: UserRole;
  /** 본문 <main>에 붙일 클래스 */
  contentClassName?: string;
  className?: string;
};

export function AppShell({
  children,
  title,
  showTopBar = true,
  showTabBar = true,
  topBarLeft,
  topBarRight,
  wishlistCount,
  role,
  contentClassName,
  className,
}: AppShellProps) {
  const [override, setOverride] = useState<string | null>(null);

  return (
    <TopBarTitleContext.Provider value={setOverride}>
      <div className={clsx('app-shell flex flex-col', className)}>
        {showTopBar && <TopBar title={override ?? title} left={topBarLeft} right={topBarRight} />}
        <main className={clsx('flex-1', showTabBar && 'tabbar-safe', contentClassName)}>
          {children}
        </main>
        {showTabBar && <BottomTabBar role={role} wishlistCount={wishlistCount} />}
      </div>
    </TopBarTitleContext.Provider>
  );
}
