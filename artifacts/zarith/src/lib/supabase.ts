import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabaseClient: SupabaseClient | null = (supabaseUrl && supabaseAnonKey)
  ? createBrowserClient(supabaseUrl, supabaseAnonKey)
  : null

export async function getCurrentUser() {
  if (!supabaseClient) return null
  const { data, error } = await supabaseClient.auth.getUser()
  if (error) return null
  return data.user
}

export async function logout() {
  if (!supabaseClient) return
  await supabaseClient.auth.signOut()
}
