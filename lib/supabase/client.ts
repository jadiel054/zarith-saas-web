import { createBrowserClient } from '@supabase/ssr'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Cliente para o navegador (Client Components)
export const supabaseClient: SupabaseClient | null = (typeof window !== 'undefined' || (supabaseUrl && supabaseAnonKey))
  ? createBrowserClient(supabaseUrl, supabaseAnonKey)
  : null

// Cliente de serviço (Server Components / API Routes)
export const supabaseServiceClient: SupabaseClient | null = (supabaseUrl && supabaseServiceKey)
  ? createClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
  : null

/**
 * Funções auxiliares
 */

export async function getCurrentUser() {
  if (!supabaseClient) return null
  const { data, error } = await supabaseClient.auth.getUser()
  if (error) throw error
  return data.user
}

export async function logout() {
  if (!supabaseClient) return
  const { error } = await supabaseClient.auth.signOut()
  if (error) throw error
}

export async function getZarithUser(authUserId: string) {
  if (!supabaseClient) return null
  const { data, error } = await supabaseClient
    .from('users')
    .select('*')
    .eq('auth_user_id', authUserId)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function createZarithUser(
  authUserId: string,
  email: string,
  displayName?: string,
  avatarUrl?: string
) {
  if (!supabaseServiceClient) return null
  const { data, error } = await supabaseServiceClient
    .from('users')
    .insert([
      {
        auth_user_id: authUserId,
        email,
        display_name: displayName,
        avatar_url: avatarUrl,
      },
    ])
    .select()
    .single()

  if (error) throw error
  return data
}
