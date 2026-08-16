import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { supabase, isConfigured } from '../lib/supabase'

// Safekeeping Requests submitted through the "+ New Transaction" form. There is no
// request register in the source sheets — this is real user input, so as of the
// Postgres migration it persists to public.safekeeping_requests instead of living
// in React state and dying on refresh.
//
// The form's shape is deep (packing lists with nested line items), so the whole
// request object is stored in a jsonb `payload` column with the fields the app
// filters and sorts on promoted to real columns.
const SafekeepingContext = createContext(null)

export function SafekeepingProvider({ children }) {
  const [requests, setRequests] = useState([])
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!isConfigured) return
    // RLS returns nothing without a session — don't fire the query at all.
    const { data: session } = await supabase.auth.getSession()
    if (!session.session) return

    const { data, error } = await supabase
      .from('safekeeping_requests')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) { setError(error.message); return }
    setError(null)
    setRequests(data.map((r) => ({ ...r.payload, id: r.id, srn: r.srn, status: r.status })))
  }, [])

  useEffect(() => {
    load()
    if (!isConfigured) return
    // Reload on sign-in: RLS returns nothing until there is a session.
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => { if (session) load() })
    return () => sub.subscription.unsubscribe()
  }, [load])

  const addRequest = useCallback(async (r) => {
    // Optimistic: the form closes immediately and the row appears in the tracker.
    setRequests((list) => [r, ...list])
    if (!isConfigured) return { error: null }

    const { data, error } = await supabase
      .from('safekeeping_requests')
      .insert({
        srn: r.srn,
        project: r.project ?? null,
        project_code: r.projectCode ?? null,
        requested_by: r.requestedBy ?? null,
        request_date: r.date ?? null,
        status: r.status || 'Submitted',
        payload: r,
      })
      .select()
      .single()

    if (error) {
      // Roll the optimistic row back so the UI never claims a save that failed.
      setRequests((list) => list.filter((x) => x.srn !== r.srn))
      setError(error.message)
      return { error }
    }
    setRequests((list) => list.map((x) => (x.srn === r.srn ? { ...r, id: data.id } : x)))
    return { error: null }
  }, [])

  const value = useMemo(() => ({ requests, addRequest, error, reload: load }), [requests, addRequest, error, load])
  return <SafekeepingContext.Provider value={value}>{children}</SafekeepingContext.Provider>
}

export function useSafekeepingRequests() {
  const ctx = useContext(SafekeepingContext)
  if (!ctx) throw new Error('useSafekeepingRequests must be used within SafekeepingProvider')
  return ctx
}
