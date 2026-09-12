/**
 * OWNER: 개발자 B (ui-foundation) — 단독 소유
 *
 * ALBASWIPE_SPEC.md <global_layout><bottom_tab_bar>
 *  높이 64px + env(safe-area-inset-bottom), 배경 surface, 상단 보더 1px line,
 *  fixed bottom 0, z-index 30.
 *  3탭: 홈(Home) / 찜(Heart) / 설정(Settings). 아이콘 24px + 라벨 11px/500, gap 4px.
 *  비활성 muted, 활성 ink-deep. Blind는 내비 활성을 레드가 아닌 잉크로 표시한다
 *  (레드는 CTA 전용). 찜 탭 개수 배지(16px 원, bg-brand, 흰 10px, 99 초과 "99+").
 *
 * fixed는 480px 컨테이너를 벗어나므로 좌우 중앙 정렬 + max-width를 직접 건다.
 */
import clsx from 'clsx';
import { NavLink } from 'react-router-dom';
import { BriefcaseBusiness, Heart, Home, UserRound, UsersRound } from 'lucide-react';
import type { UserRole } from '@/types';

export type BottomTabBarProps = {
  role?: UserRole;
  /** 찜 탭 배지 숫자. 0이거나 undefined면 배지를 그리지 않는다. */
  wishlistCount?: number;
  className?: string;
};

const SEEKER_TABS = [
  { to: '/', label: '홈', Icon: Home },
  { to: '/wishlist', label: '찜', Icon: Heart },
  { to: '/me', label: '내정보', Icon: UserRound },
] as const;

const EMPLOYER_TABS = [
  { to: '/employer/applicants', label: '지원자', Icon: UsersRound },
  { to: '/employer/jobs', label: '내 공고', Icon: BriefcaseBusiness },
  { to: '/me', label: '내정보', Icon: UserRound },
] as const;

export function BottomTabBar({ role = 'seeker', wishlistCount, className }: BottomTabBarProps) {
  const tabs = role === 'employer' ? EMPLOYER_TABS : SEEKER_TABS;
  const badge =
    typeof wishlistCount === 'number' && wishlistCount > 0
      ? wishlistCount > 99
        ? '99+'
        : String(wishlistCount)
      : null;

  return (
    <nav
      aria-label="주요 메뉴"
      className={clsx(
        'bg-surface border-line fixed bottom-0 left-1/2 z-30 w-full max-w-[480px]',
        '-translate-x-1/2 border-t',
        className,
      )}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="flex h-16 items-stretch">
        {tabs.map(({ to, label, Icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex h-full w-full flex-col items-center justify-center gap-1',
                  'transition-colors select-none',
                  isActive ? 'text-ink-deep' : 'text-muted',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className={clsx('relative', isActive && 'tab-pop')}>
                    <Icon
                      size={24}
                      strokeWidth={1.75}
                      fill={isActive && to === '/wishlist' ? 'currentColor' : 'none'}
                      aria-hidden
                    />
                    {to === '/wishlist' && badge && (
                      <span
                        className="bg-brand tabular absolute -top-1 -right-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-none font-semibold text-white"
                        aria-label={`찜한 공고 ${wishlistCount}개`}
                      >
                        {badge}
                      </span>
                    )}
                  </span>
                  <span className="text-[11px] leading-[1.3] font-medium">{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
