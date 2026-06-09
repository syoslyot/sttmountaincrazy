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

// ─── localStorage helpers ─────────────────────────────────────────────────────

const PROFILE_CACHE_KEY = 'stt-profile-cache'

function getCachedProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY)
    return raw ? (JSON.parse(raw) as UserProfile) : null
  } catch { return null }
}

function setCachedProfile(profile: UserProfile | null) {
  if (profile) localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile))
  else localStorage.removeItem(PROFILE_CACHE_KEY)
}

// Returns the user object stored by Supabase in localStorage (synchronous).
// Used only to detect "might be logged in" without an async call.
function getStoredUser(): User | null {
  try {
    const key = Object.keys(localStorage).find(
      k => k.startsWith('sb-') && k.endsWith('-auth-token'),
    )
    if (!key) return null
    const stored = JSON.parse(localStorage.getItem(key) ?? 'null')
    return (stored?.user as User) ?? null
  } catch { return null }
}

// ─── AuthProvider ─────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user:    null,
    profile: null,
    role:    null,
    loading: true,
  })

  useEffect(() => {
    const client = getAuthClient()

    // Pre-load from localStorage in a microtask so nav renders the correct
    // state well before getSession() (~500ms) returns, without calling
    // setState directly in the effect body (satisfies react-hooks/set-state-in-effect).
    queueMicrotask(() => {
      const storedUser = getStoredUser()
      if (!storedUser) {
        setState({ user: null, profile: null, role: null, loading: false })
      } else {
        const cached = getCachedProfile()
        if (cached) {
          setState({ user: storedUser, profile: cached, role: cached.role, loading: false })
        }
      }
    })

    async function loadProfile(user: User | null) {
      if (!user) {
        setCachedProfile(null)
        setState({ user: null, profile: null, role: null, loading: false })
        return
      }
      const profile = await fetchUserProfile(user.id)
      setCachedProfile(profile)
      setState({ user, profile, role: profile?.role ?? null, loading: false })
    }

    client.auth.getSession().then(({ data }) => {
      loadProfile(data.session?.user ?? null)
    })

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
