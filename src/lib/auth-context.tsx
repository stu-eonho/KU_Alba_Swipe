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
import type { AppUser, UserRole } from '@/types';

type SignUpArgs = {
  email: string;
  password: string;
  nickname: string;
  role: UserRole;
  /** 숫자 11자리. DB trigger 가 이 값으로 user_contacts 행을 만듭니다 */
  phone: string;
};
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

  // Phase 1 에 만들어진 계정에는 role 이 없습니다. 그 계정이 로그인했을 때
  // 화면이 비는 것보다 구직자로 보이는 편이 낫습니다.
  const metadataRole = user.user_metadata?.role;
  const role: UserRole = metadataRole === 'employer' ? 'employer' : 'seeker';

  // Phase 11 이전 계정에는 전화번호가 없습니다. 화면은 null 을 다룰 수 있어야 합니다.
  const metadataPhone = user.user_metadata?.phone;
  const phone = typeof metadataPhone === 'string' && metadataPhone ? metadataPhone : null;

  return { id: user.id, email, nickname, role, phone };
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

      async signUp({ email, password, nickname, role, phone }) {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          // 닉네임과 역할은 auth.users.user_metadata 에 넣습니다.
          // 별도 profiles 테이블을 만들지 않고, role 은 JWT 에 실려 RLS 에서 바로 쓸 수 있습니다.
          /*
           * phone 은 DB trigger(handle_new_user_contact)가 읽어 user_contacts 행을
           * 만듭니다. 가입 후 따로 insert 하지 않는 이유는, 그 사이에 실패하면
           * 연락처 없는 계정이 남기 때문입니다. 형식이 틀리면 가입 자체가 실패합니다.
           */
          options: { data: { nickname: nickname.trim(), role, phone } },
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
