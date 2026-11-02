/**
 * Sessão local do Zarith (JWT nativo do api-server).
 * Substitui o armazenamento do Supabase Auth no fluxo de email/senha.
 */

const TOKEN_KEY = "zarith-auth-token";
const USER_KEY = "zarith-auth-user";

export type AuthUser = {
  id: string;
  email: string;
  name?: string | null;
  avatar_url?: string | null;
  email_verified?: boolean;
  is_active?: boolean;
  is_admin?: boolean;
};

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getAuthUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setAuthSession(token: string, user: AuthUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  // limpa token legado do Supabase se existir
  try {
    localStorage.removeItem("supabase-auth-token");
  } catch {
    /* ignore */
  }
}

export function clearAuthSession(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    /* ignore */
  }
}

export function isAuthenticated(): boolean {
  return Boolean(getAuthToken());
}
