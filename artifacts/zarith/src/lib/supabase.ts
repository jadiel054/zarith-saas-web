/**
 * Cliente Supabase para SPA (Vite + React).
 *
 * IMPORTANTE: usamos `createClient` de `@supabase/supabase-js` e NÃO
 * `createBrowserClient` de `@supabase/ssr`.
 *
 * O pacote @supabase/ssr foi criado para frameworks SSR (Next.js, SvelteKit)
 * e armazena o code_verifier PKCE em cookies gerenciados pelo servidor.
 * Em um SPA puro, isso faz o verificador PKCE sumir entre a iniciação do OAuth
 * e o callback, resultando no erro:
 *   "PKCE code verifier not found in storage"
 *
 * Com `createClient`:
 *  - flowType: 'pkce' → usa PKCE (seguro)
 *  - storage: localStorage → persiste o verifier entre redirecionamentos
 *  - detectSessionInUrl: true → troca o `code` por sessão automaticamente
 *    quando a página de callback carrega, sem precisar chamar
 *    exchangeCodeForSession() manualmente
 *  - persistSession: true → mantém o usuário logado entre refreshes
 *  - autoRefreshToken: true → renova o token antes de expirar
 */
import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseClient: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          flowType: 'pkce',
          storage: localStorage,
          autoRefreshToken: true,
          persistSession: true,
          // Com detectSessionInUrl: true, o Supabase detecta automaticamente
          // o parâmetro `code` na URL e troca por sessão ao carregar a página.
          // Isso resolve o callback do OAuth sem chamar exchangeCodeForSession().
          detectSessionInUrl: true,
        },
      })
    : null

/**
 * Retorna o usuário da sessão atual ou null se não autenticado.
 * Usa getSession() que é síncrono (lê do cache local) — mais rápido que getUser().
 */
export async function getCurrentUser() {
  if (!supabaseClient) return null
  const { data: { session } } = await supabaseClient.auth.getSession()
  return session?.user ?? null
}

/**
 * Encerra a sessão do usuário.
 */
export async function logout() {
  if (!supabaseClient) return
  await supabaseClient.auth.signOut()
}
