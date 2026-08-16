import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase, isConfigured } from '../lib/supabase'
import { hydrate } from '../lib/hydrate'
import { DEMO_USERS, DEMO_PASSWORD } from '../data/roles'

const AuthContext = createContext()
const LS_KEY = 'wms-demo-session'

// Build a profile object from a Supabase user + profiles row, with a fallback
// to the DEMO_USERS table keyed by email so the prototype always has a role.
function resolveProfile(email, row) {
  const demo = DEMO_USERS.find((u) => u.email === email)
  return {
    email,
    name: row?.full_name || demo?.name || email.split('@')[0],
    role: row?.role || demo?.role || 'warehouse',
    department: row?.department || demo?.department || '—',
    accessLevel: row?.access_level || demo?.accessLevel || 'Standard',
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (sessionUser) => {
    let row = null
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sessionUser.id)
        .maybeSingle()
      row = data
    } catch {
      /* profiles table may not exist yet — fall back to demo mapping */
    }
    setUser(resolveProfile(sessionUser.email, row))
  }, [])

  useEffect(() => {
    if (!isConfigured) {
      const saved = localStorage.getItem(LS_KEY)
      if (saved) setUser(JSON.parse(saved))
      setLoading(false)
      return
    }
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session?.user) await loadProfile(data.session.user)
      else {
        const saved = localStorage.getItem(LS_KEY) // restore demo-fallback session
        if (saved) setUser(JSON.parse(saved))
      }
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) await loadProfile(session.user)
      else if (event === 'SIGNED_OUT') {
        // Don't clobber a demo-fallback session on the null INITIAL_SESSION event.
        if (!localStorage.getItem(LS_KEY)) setUser(null)
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [loadProfile])

  const signIn = async (email, password) => {
    // Demo mode (no Supabase configured): accept any known demo email.
    // Dev only — a production build without env vars must not let anyone in.
    if (!isConfigured) {
      if (!import.meta.env.DEV) {
        return { error: { message: 'Authentication is not configured. Contact the administrator.' } }
      }
      const profile = resolveProfile(email, null)
      setUser(profile)
      localStorage.setItem(LS_KEY, JSON.stringify(profile))
      return { error: null }
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    // The tables are RLS-gated, so the pre-render hydration in main.jsx returned
    // nothing if there was no session. Now that there is one, load for real —
    // awaited here so /dashboard mounts against the Postgres data, not the
    // bundled snapshot.
    if (!error) await hydrate()
    // Dev-only convenience: a known demo account + demo password works before
    // the Supabase users are seeded. Stripped from production builds — on the
    // public site, only real Supabase credentials are accepted.
    if (error && import.meta.env.DEV) {
      const demo = DEMO_USERS.find((u) => u.email === email)
      if (demo && password === DEMO_PASSWORD) {
        const profile = resolveProfile(email, null)
        setUser(profile)
        localStorage.setItem(LS_KEY, JSON.stringify(profile))
        return { error: null }
      }
    }
    return { error }
  }

  const signOut = async () => {
    if (isConfigured) await supabase.auth.signOut()
    localStorage.removeItem(LS_KEY)
    setUser(null)
  }

  // Local role switch for the prototype demo (does not touch Supabase).
  // Dev only: in production a user's role comes from public.profiles and must
  // not be changeable client-side.
  const canSwitchRole = import.meta.env.DEV
  const switchRole = (role) => {
    if (!canSwitchRole) return
    setUser((u) => {
      const next = { ...u, role }
      if (!isConfigured) localStorage.setItem(LS_KEY, JSON.stringify(next))
      return next
    })
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, switchRole, canSwitchRole, isConfigured }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
