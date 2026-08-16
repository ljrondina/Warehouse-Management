import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// isConfigured is false only if env vars are missing — lets the app run in a
// local demo mode so the prototype is always presentable.
export const isConfigured = Boolean(url && key)

export const supabase = isConfigured
  ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } })
  : null
