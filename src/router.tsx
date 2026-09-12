/**
 * OWNER: 개발자 B (ui-foundation) — 단독 소유
 *
 * 개발자 A: 이 파일을 수정하지 마세요. 새 라우트가 필요하면 B에게 요청하세요.
 *
 * ALBASWIPE_SPEC.md <route_definitions> + <component_hierarchy><app_shell>
 *   public    : /login, /signup            → PublicLayout (탑바·탭바 없음)
 *   protected : /, /wishlist, /settings    → RequireAuth + MainLayout (탑바 + 탭바)
 *   protected : /apply/:jobId              → RequireAuth + FullscreenLayout (탭바 없음, 뒤로가기만)
 *   * → / 로 리다이렉트 (404 전용 화면을 만들지 않는다)
 *
 * 화면 제목은 라우트의 handle.title에서 온다. 데이터에 따라 바꿔야 하면
 * 페이지 안에서 `useTopBarTitle('찜한 공고 8')`을 호출한다.
 *
 * 탭바 찜 배지는 MainLayout에서 useWishlist().count로 연결한다.
 */
import { createBrowserRouter, Navigate, Outlet, useMatches, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { AppShell, RequireAuth, RequireRole } from '@/components/layout';
import { useWishlist } from '@/hooks/useWishlist';
import { useAuth } from '@/lib/auth-context';
import { Tutorial } from '@/features/onboarding';
import { EmployerJobsPlaceholder } from '@/features/employer-ui';
import { ProfileEditor } from '@/features/profile';
import { IconButton } from '@/components/ui';
import HomeDeckPage from '@/pages/HomeDeckPage';
import WishlistPage from '@/pages/WishlistPage';
import ApplyPage from '@/pages/ApplyPage';
import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';
import SettingsPage from '@/pages/SettingsPage';
import EmployerApplicantsPage from '@/pages/EmployerApplicantsPage';

type RouteHandle = { title?: string };

function useRouteTitle(): string | undefined {
  const matches = useMatches();
  for (let i = matches.length - 1; i >= 0; i -= 1) {
    const handle = matches[i].handle as RouteHandle | undefined;
    if (handle?.title) return handle.title;
  }
  return undefined;
}

/** 로그인 / 회원가입 — 480px 컨테이너만. 탑바도 탭바도 없다. */
function PublicLayout() {
  return (
    <AppShell showTopBar={false} showTabBar={false}>
      <Outlet />
    </AppShell>
  );
}

/** 역할별 주 화면 — 탑바 56px + 탭바 64px */
function MainLayout() {
  const { user } = useAuth();
  const title = useRouteTitle();

  if (user?.role === 'employer') {
    return (
      <AppShell title={title} role="employer">
        <Outlet />
      </AppShell>
    );
  }

  return <SeekerMainLayout title={title} />;
}

function SeekerMainLayout({ title }: { title?: string }) {
  // 찜 개수 배지. ['swipes'] 캐시를 공유하므로 찜 화면과 항상 같은 값을 보여준다.
  const { count } = useWishlist();
  return (
    <AppShell title={title} role="seeker" wishlistCount={count}>
      <Outlet />
      {/* 첫 가입자 튜토리얼. localStorage로 자체 판단하므로 조건 없이 둔다 (F6) */}
      <Tutorial />
    </AppShell>
  );
}

function MyPage() {
  const { user } = useAuth();
  return user?.role === 'employer' ? <SettingsPage /> : <ProfileEditor />;
}

/** 지원 화면 — 탭바 없음, 상단에 뒤로가기만 */
function FullscreenLayout() {
  const navigate = useNavigate();
  const title = useRouteTitle();
  return (
    <AppShell
      title={title}
      showTabBar={false}
      topBarLeft={
        <IconButton label="뒤로 가기" size={44} onClick={() => navigate(-1)}>
          <ChevronLeft size={24} strokeWidth={1.75} aria-hidden />
        </IconButton>
      }
    >
      <Outlet />
    </AppShell>
  );
}

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/signup', element: <SignupPage /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <MainLayout />,
        children: [
          {
            element: <RequireRole role="seeker" redirectTo="/employer/applicants" />,
            children: [
              { path: '/', element: <HomeDeckPage />, handle: { title: 'AlbaSwipe' } },
              { path: '/wishlist', element: <WishlistPage />, handle: { title: '찜한 공고' } },
            ],
          },
          {
            element: <RequireRole role="employer" redirectTo="/" />,
            children: [
              {
                path: '/employer/applicants',
                element: <EmployerApplicantsPage />,
                handle: { title: '지원자' },
              },
              {
                path: '/employer/jobs',
                element: <EmployerJobsPlaceholder />,
                handle: { title: '내 공고' },
              },
            ],
          },
          { path: '/me', element: <MyPage />, handle: { title: '내 정보' } },
          { path: '/settings', element: <SettingsPage />, handle: { title: '설정' } },
        ],
      },
      {
        element: <FullscreenLayout />,
        children: [
          {
            element: <RequireRole role="seeker" redirectTo="/employer/applicants" />,
            children: [
              { path: '/apply/:jobId', element: <ApplyPage />, handle: { title: '지원하기' } },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
