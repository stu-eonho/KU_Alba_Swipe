/**
 * OWNER: Dev A (data/auth)
 *
 * TODO(A): implement AuthProvider + useAuth.
 *
 * Must expose: { user: AppUser | null, isLoading: boolean, signUp, signIn, signOut }
 *
 * GOTCHA: on mount, call supabase.auth.getSession() and subscribe to onAuthStateChange.
 * Keep isLoading=true while restoring. Without it the login screen flashes on every
 * refresh before jumping to home - the most visible bug in the whole demo.
 */
import { createContext, useContext } from 'react';
import type { AppUser } from '@/types';

type AuthValue = {
  user: AppUser | null;
  isLoading: boolean;
};

const AuthContext = createContext<AuthValue>({ user: null, isLoading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // TODO(A): replace with real session handling
  return <AuthContext.Provider value={{ user: null, isLoading: false }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
