/**
 * OWNER: 개발자 A (데이터/인증)
 *
 * 세션의 단일 소스입니다. 화면은 supabase.auth 를 직접 부르지 않고 useAuth() 만 씁니다.
 *
 * CRITICAL: 마운트 시 getSession() 으로 세션을 복구하는 동안 isLoading 이 true 입니다.
 * 이 처리가 없으면 새로고침할 때마다 로그인 화면이 깜빡 보였다가 홈으로 튑니다.
 * 데모에서 가장 티 나는 버그입니다.
 *
 * 주의: 이 Provider 는 RouterProvider 바깥에 있으므로 여기서 navigate 를 쓸 수 없습니다.
 * 로그아웃 후 이동은 화면(<RequireAuth> 또는 SettingsPage)이 담당합니다.
 */
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import { toAuthFailure } from './auth-errors';
import type { AppUser } from '@/types';

type SignUpArgs = { email: string; password: string; nickname: string };
type SignInArgs = { email: string; password: string };

type AuthValue = {
  user: AppUser | null;
  isLoading: boolean;
  signUp: (args: SignUpArgs) => Promise<void>;
  signIn: (args: SignInArgs) => Promise<void>;
  signOut: () => Promise<void>;
};

/** auth.users → 화면이 쓰는 AppUser. 변환은 여기 한 곳에서만 합니다. */
function toAppUser(user: User | null | undefined): AppUser | null {
  if (!user) return null;

  const email = user.email ?? '';
  const metadataNickname = user.user_metadata?.nickname;
  const nickname =
    typeof metadataNickname === 'string' && metadataNickname.trim().length > 0
      ? metadataNickname.trim()
      : // 닉네임 없이 만들어진 계정(테스트 계정 등)이 빈 이름으로 보이지 않게 합니다.
        (email.split('@')[0] ?? '회원');

  return { id: user.id, email, nickname };
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) console.error('[auth] 세션 복구 실패:', error.message);
        setUser(toAppUser(data.session?.user));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(toAppUser(session?.user));
      // 토큰 갱신으로 이 콜백이 늦게 불려도 로딩이 다시 켜지지 않게 합니다.
      setIsLoading(false);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      isLoading,

      async signUp({ email, password, nickname }) {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          // 닉네임은 auth.users.user_metadata 에 넣습니다. 별도 profiles 테이블을 만들지 않습니다.
          options: { data: { nickname: nickname.trim() } },
        });
        if (error) throw toAuthFailure(error);
        // Confirm email 이 꺼져 있으면 여기서 이미 세션이 생기고
        // onAuthStateChange 가 user 를 채웁니다.
      },

      async signIn({ email, password }) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw toAuthFailure(error);
      },

      async signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) console.error('[auth] 로그아웃 실패:', error.message);
        // 다음 사용자가 앞사람의 찜 목록을 보지 않도록 캐시를 통째로 비웁니다.
        setUser(null);
        queryClient.clear();
      },
    }),
    [user, isLoading, queryClient],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth 는 <AuthProvider> 안에서만 쓸 수 있습니다.');
  return value;
}
