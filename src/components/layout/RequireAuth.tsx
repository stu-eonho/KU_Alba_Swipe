/**
 * OWNER: 개발자 B (ui-foundation) — 단독 소유
 *
 * 보호 라우트 가드. `useAuth()`는 개발자 A 소유(`@/lib/auth-context`)이며
 * 현재 시그니처 `{ user: AppUser | null, isLoading: boolean }`에 맞춰 작성했다.
 * A가 내용을 채우면 수정 없이 그대로 동작한다.
 *
 * CRITICAL: isLoading 동안 전체 화면 스피너를 보여준다.
 * 이게 없으면 새로고침마다 로그인 화면이 깜빡였다가 홈으로 튄다 — 데모에서 가장 눈에 띄는 버그.
 */
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import { FullScreenSpinner } from '@/components/ui';
import type { UserRole } from '@/types';

export function RequireAuth({ children }: { children?: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <FullScreenSpinner label="세션을 확인하는 중" />;

  if (!user) {
    // 로그인 후 원래 가려던 곳으로 되돌리기 위해 from을 실어 보낸다
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  return <>{children ?? <Outlet />}</>;
}

export function RequireRole({
  role,
  redirectTo,
  children,
}: {
  role: UserRole;
  redirectTo: string;
  children?: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <FullScreenSpinner label="권한을 확인하는 중" />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={redirectTo} replace />;

  return <>{children ?? <Outlet />}</>;
}
