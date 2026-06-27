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
import type { Session, SupabaseClient } from '@supabase/supabase-js'

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

const DEFAULT_AUTH_SESSION_TIMEOUT_MS = 8_000

export const AUTH_SESSION_TIMEOUT_MS = (() => {
  const parsedTimeout = Number(import.meta.env.VITE_AUTH_SESSION_TIMEOUT_MS ?? DEFAULT_AUTH_SESSION_TIMEOUT_MS)

  if (Number.isFinite(parsedTimeout) && parsedTimeout > 0) {
    return parsedTimeout
  }

  return DEFAULT_AUTH_SESSION_TIMEOUT_MS
})()

export type SessionBootstrapResult = {
  session: Session | null
  error: Error | null
  timedOut: boolean
}

function normalizeAuthError(error: unknown): Error {
  if (error instanceof Error) return error
  if (typeof error === 'string') return new Error(error)
  return new Error('Falha desconhecida ao recuperar a sessão.')
}

/**
 * Bootstrap resiliente da sessão inicial.
 *
 * Mantém logs temporários de diagnóstico e força um fallback seguro caso
 * `getSession()` fique pendente além do timeout configurado.
 */
export async function getSessionWithTimeout(
  timeoutMs = AUTH_SESSION_TIMEOUT_MS,
): Promise<SessionBootstrapResult> {
  if (!supabaseClient) {
    return { session: null, error: null, timedOut: false }
  }

  const safeTimeoutMs =
    Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : AUTH_SESSION_TIMEOUT_MS

  console.info(`[Auth bootstrap] Iniciando getSession() com timeout de ${safeTimeoutMs}ms.`)

  let timeoutHandle: ReturnType<typeof setTimeout> | undefined

  try {
    const sessionPromise = supabaseClient.auth.getSession().then(({ data: { session }, error }) => ({
      session,
      error: error ? normalizeAuthError(error) : null,
      timedOut: false,
    }))

    const timeoutPromise = new Promise<SessionBootstrapResult>((resolve) => {
      timeoutHandle = setTimeout(() => {
        const timeoutError = new Error(`getSession() excedeu ${safeTimeoutMs}ms.`)
        console.warn('[Auth bootstrap] Timeout em getSession(); aplicando fallback seguro.')
        resolve({ session: null, error: timeoutError, timedOut: true })
      }, safeTimeoutMs)
    })

    const result = await Promise.race([sessionPromise, timeoutPromise])

    if (result.error && !result.timedOut) {
      console.warn('[Auth bootstrap] getSession() retornou erro.', result.error)
    } else {
      console.info('[Auth bootstrap] getSession() concluído.', {
        hasSession: Boolean(result.session),
        timedOut: result.timedOut,
      })
    }

    return result
  } catch (error) {
    const normalizedError = normalizeAuthError(error)
    console.error('[Auth bootstrap] Falha inesperada em getSession().', normalizedError)
    return { session: null, error: normalizedError, timedOut: false }
  } finally {
    if (timeoutHandle !== undefined) {
      clearTimeout(timeoutHandle)
    }
  }
}

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
