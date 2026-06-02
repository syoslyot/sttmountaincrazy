'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import {
  getAuthClient,
  fetchUserProfile,
  type MemberRole,
  type UserProfile,
} from '@/lib/auth'

interface AuthState {
  user:    User | null
  profile: UserProfile | null
  role:    MemberRole | null
  loading: boolean
}

interface AuthContextValue extends AuthState {
  signIn:  (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

const AuthCtx = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user:    null,
    profile: null,
    role:    null,
    loading: true,
  })

  useEffect(() => {
    const client = getAuthClient()

    async function loadProfile(user: User | null) {
      if (!user) {
        setState({ user: null, profile: null, role: null, loading: false })
        return
      }
      const profile = await fetchUserProfile(user.id)
      setState({ user, profile, role: profile?.role ?? null, loading: false })
    }

    client.auth.getSession().then(({ data }) =>
      loadProfile(data.session?.user ?? null),
    )

    const { data: { subscription } } = client.auth.onAuthStateChange(
      (_event, session) => { loadProfile(session?.user ?? null) },
    )

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string) {
    const { error } = await getAuthClient().auth.signInWithPassword({ email, password })
    return { error }
  }

  async function signOut() {
    await getAuthClient().auth.signOut()
  }

  return (
    <AuthCtx.Provider value={{ ...state, signIn, signOut }}>
      {children}
    </AuthCtx.Provider>
  )
}

/** Must be called inside a component wrapped by AuthProvider. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
