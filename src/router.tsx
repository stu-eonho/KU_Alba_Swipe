/**
 * OWNER: 개발자 B (ui-foundation) — 단독 소유
 *
 * 개발자 A: 이 파일을 수정하지 마세요. 새 라우트가 필요하면 B에게 요청하세요.
 *
 * ALBASWIPE_SPEC.md <route_definitions> + <component_hierarchy><app_shell>
 *   public    : /login, /signup            → PublicLayout (탑바·탭바 없음)
 *   protected : /, /wishlist, /settings    → RequireAuth + MainLayout (탑바 + 탭바)
 *   protected : /apply/:jobId              → RequireAuth + FullscreenLayout (탭바 없음, 뒤로가기만)
 *   protected : /jobs/:jobId               → 홈 덱 카드 탭 → 공고 상세 (같은 FullscreenLayout)
 *   * → / 로 리다이렉트 (404 전용 화면을 만들지 않는다)
 *
 * 화면 제목은 라우트의 handle.title에서 온다. 데이터에 따라 바꿔야 하면
 * 페이지 안에서 `useTopBarTitle('찜한 공고 8')`을 호출한다.
 *
 * 탭바 찜 배지는 MainLayout에서 useWishlist().count로 연결한다.
 */
import { createBrowserRouter, Navigate, Outlet, useLocation, useMatches } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { AppShell, RequireAuth, RequireRole, useSmartBack } from '@/components/layout';
import { useWishlist } from '@/hooks/useWishlist';
import { useAuth } from '@/lib/auth-context';
import { Tutorial } from '@/features/onboarding';
// 배럴은 A/B 공용이라 이번 Phase 에서 손대지 않는다. 새 헬퍼만 직접 경로로 가져온다.
import { isTutorialDeckPath } from '@/features/onboarding/Tutorial';
import EmployerJobsPage from '@/pages/EmployerJobsPage';
import EmployerJobFormPage from '@/pages/EmployerJobFormPage';
import { ProfileEditor } from '@/features/profile';
import { AvailabilityPage } from '@/features/availability';
import { NotificationBell } from '@/features/notifications';
import { IconButton } from '@/components/ui';
import HomeDeckPage from '@/pages/HomeDeckPage';
import WishlistPage from '@/pages/WishlistPage';
import ApplyPage from '@/pages/ApplyPage';
import JobDetailPage from '@/pages/JobDetailPage';
import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';
import SettingsPage from '@/pages/SettingsPage';
import EmployerApplicantsPage from '@/pages/EmployerApplicantsPage';
import MyApplicationsPage from '@/pages/MyApplicationsPage';
import ApplicationDetailPage from '@/pages/ApplicationDetailPage';
import NotificationsPage from '@/pages/NotificationsPage';

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
  const { pathname } = useLocation();

  if (user?.role === 'employer') {
    return (
      <AppShell title={title} role="employer" topBarRight={<NotificationBell />}>
        <Outlet />
        {/*
          구인자 튜토리얼(F9). 역할은 Tutorial 이 useAuth()로 직접 읽으므로 prop 이 필요 없다.
          이 줄이 없으면 구인자에게는 튜토리얼이 아예 마운트되지 않는다.

          PHASE8 G1 — **덱 화면(/employer/applicants)에서만** 마운트한다. 이 레이아웃은
          /settings 와 /employer/* 전체가 공유하므로 라우트가 바뀌어도 언마운트되지 않는다.
          Tutorial 은 selfOpen · startedOnDeck 을 마운트 시 한 번만 읽으니, 항상 달아 두면
          ① 설정에서 "다시 보기"를 눌러 덱으로 와도 다시 읽히지 않아 아무 일이 없고
          ② 로그인 직후 '/' 를 거쳐 리다이렉트되는 동안 마운트돼 startedOnDeck 이 false 로
            굳어(스포트라이트 대신 슬라이드) 뜬다.
          조건부로 달면 덱 도착이 곧 새 마운트라 둘 다 사라진다. 판정은 Tutorial 이
          제 DECK_PATH 로 하므로 경로가 두 군데에 중복되지 않는다.
        */}
        {isTutorialDeckPath(pathname, 'employer') && <Tutorial key={user.id} userId={user.id} />}
      </AppShell>
    );
  }

  return <SeekerMainLayout title={title} pathname={pathname} />;
}

function SeekerMainLayout({ title, pathname }: { title?: string; pathname: string }) {
  // 찜 개수 배지. ['swipes'] 캐시를 공유하므로 찜 화면과 항상 같은 값을 보여준다.
  const { count } = useWishlist();
  const { user } = useAuth();
  if (!user) return null;
  return (
    <AppShell title={title} role="seeker" wishlistCount={count} topBarRight={<NotificationBell />}>
      <Outlet />
      {/* 첫 가입자 튜토리얼 (F6). 덱('/')에서만 마운트하는 이유는 위 구인자 분기 주석 참고. */}
      {isTutorialDeckPath(pathname, 'seeker') && <Tutorial key={user.id} userId={user.id} />}
    </AppShell>
  );
}

function LegacyMeRedirect() {
  const { user } = useAuth();
  return <Navigate to={user?.role === 'employer' ? '/settings' : '/settings/profile'} replace />;
}

/** 지원 화면 — 탭바 없음, 상단에 뒤로가기만. 직접 연 링크는 홈으로 폴백. */
function FullscreenLayout() {
  const goBack = useSmartBack('/');
  const title = useRouteTitle();
  return (
    <AppShell
      title={title}
      showTabBar={false}
      topBarLeft={
        <IconButton label="뒤로 가기" size={44} onClick={goBack}>
          <ChevronLeft size={24} strokeWidth={1.75} aria-hidden />
        </IconButton>
      }
    >
      <Outlet />
    </AppShell>
  );
}

/** backTo 는 고정 목적지가 아니라 히스토리가 없을 때의 폴백이다. */
function SettingsFullscreenLayout({ backTo }: { backTo: string }) {
  const goBack = useSmartBack(backTo);
  const title = useRouteTitle();
  return (
    <AppShell
      title={title}
      showTabBar={false}
      topBarLeft={
        <IconButton label="뒤로 가기" size={44} onClick={goBack}>
          <ChevronLeft size={24} strokeWidth={1.75} aria-hidden />
        </IconButton>
      }
    >
      <Outlet />
    </AppShell>
  );
}

function NotificationsLayout() {
  const { user } = useAuth();
  return (
    <SettingsFullscreenLayout
      backTo={user?.role === 'employer' ? '/employer/applicants' : '/settings'}
    />
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
                element: <EmployerJobsPage />,
                handle: { title: '내 공고' },
              },
            ],
          },
          { path: '/me', element: <LegacyMeRedirect /> },
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
              // 홈 덱에서 카드를 탭하면 확대 오버레이가 아니라 이 화면으로 이동한다 (PHASE7 F3).
              // 지금은 RequireAuth 안이다 — 비로그인 공유 링크는 범위 밖.
              { path: '/jobs/:jobId', element: <JobDetailPage />, handle: { title: '공고 상세' } },
            ],
          },
          {
            // 공고 작성은 긴 폼이라 탭바를 숨기고 뒤로가기만 둔다.
            element: <RequireRole role="employer" redirectTo="/" />,
            children: [
              {
                path: '/employer/jobs/new',
                element: <EmployerJobFormPage />,
                handle: { title: '공고 작성' },
              },
            ],
          },
        ],
      },
      {
        element: <RequireRole role="seeker" redirectTo="/settings" />,
        children: [
          {
            element: <SettingsFullscreenLayout backTo="/settings" />,
            children: [
              {
                path: '/settings/profile',
                element: <ProfileEditor />,
                handle: { title: '내 정보 수정' },
              },
              {
                path: '/settings/applications',
                element: <MyApplicationsPage />,
                handle: { title: '지원 현황' },
              },
              {
                path: '/settings/availability',
                element: <AvailabilityPage />,
                handle: { title: '가능한 시간' },
              },
            ],
          },
          {
            element: <SettingsFullscreenLayout backTo="/settings/applications" />,
            children: [
              {
                path: '/settings/applications/:applicationId',
                element: <ApplicationDetailPage />,
                handle: { title: '지원 상세' },
              },
            ],
          },
        ],
      },
      {
        element: <NotificationsLayout />,
        children: [
          {
            path: '/notifications',
            element: <NotificationsPage />,
            handle: { title: '알림' },
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
