/**
 * API Client para o Zarith
 * Cliente HTTP para comunicar com o backend
 * 
 * NOTA: Este cliente substitui o Supabase Client para operações de banco
 * A autenticação (login/signup) continua usando Supabase Auth
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

// Tipos de resposta
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Configuração do fetch
export interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
}

// Função auxiliar para construir URL com query params
function buildUrl(path: string, params?: Record<string, string | number | boolean>): string {
  let url = `${API_BASE_URL}/api/${path}`;
  
  if (params && Object.keys(params).length > 0) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        query.append(key, String(value));
      }
    }
    url += `?${query.toString()}`;
  }
  
  return url;
}

// Função auxiliar para obter headers com autenticação
function getHeaders(headers?: HeadersInit): HeadersInit {
  const defaultHeaders: HeadersInit = {
    "Content-Type": "application/json",
  };
  
  // Obter token de autenticação do Supabase (se disponível)
  const supabaseToken = localStorage.getItem("supabase-auth-token");
  if (supabaseToken) {
    try {
      const token = JSON.parse(supabaseToken).access_token;
      if (token) {
        defaultHeaders["Authorization"] = `Bearer ${token}`;
      }
    } catch {
      // Ignorar erro
    }
  }
  
  return { ...defaultHeaders, ...headers };
}

// Função principal do API Client
export async function apiFetch<T>(
  path: string,
  options: FetchOptions = {}
): Promise<ApiResponse<T>> {
  const { params, headers, ...fetchOptions } = options;
  const url = buildUrl(path, params);
  const finalHeaders = getHeaders(headers);
  
  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers: finalHeaders,
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: data.error || data.message || `HTTP ${response.status}`,
      };
    }
    
    return {
      success: true,
      data: data.data || data,
      message: data.message,
    };
  } catch (error) {
    console.error("API Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro de conexão",
    };
  }
}

// ============================================================================
// CONVERSAÇÕES
// ============================================================================

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  model: string;
  temperature: string;
  is_public: boolean;
  share_token?: string;
  created_at: string;
  updated_at: string;
  messages_count: number;
  tokens_used: number;
}

export interface ConversationListResponse {
  data: Conversation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const conversationsApi = {
  /** Listar conversas do usuário */
  list: (params?: { page?: number; limit?: number; search?: string }) =>
    apiFetch<ConversationListResponse>("database/conversations", { params }),
  
  /** Obter conversa por ID */
  get: (id: string) =>
    apiFetch<Conversation>("database/conversations/" + id),
  
  /** Criar nova conversa */
  create: (data: { title?: string; model?: string; temperature?: string }) =>
    apiFetch<Conversation>("database/conversations", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  
  /** Atualizar conversa */
  update: (id: string, data: Partial<Omit<Conversation, "id" | "user_id" | "created_at">>) =>
    apiFetch<Conversation>("database/conversations/" + id, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  
  /** Deletar conversa */
  delete: (id: string) =>
    apiFetch<Conversation>("database/conversations/" + id, {
      method: "DELETE",
    }),
  
  /** Incrementar contador de mensagens */
  incrementMessages: (id: string) =>
    apiFetch<Conversation>("database/conversations/" + id + "/increment-messages", {
      method: "PATCH",
    }),
  
  /** Atualizar tokens usados */
  updateTokens: (id: string, tokens: number) =>
    apiFetch<Conversation>("database/conversations/" + id + "/tokens", {
      method: "PATCH",
      body: JSON.stringify({ tokens }),
    }),
};

// ============================================================================
// MENSAGENS
// ============================================================================

export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  model?: string;
  token_count?: number;
  tool_call_id?: string;
  tool_name?: string;
  tool_arguments?: string;
  tool_result?: string;
  created_at: string;
}

export interface MessageListResponse {
  data: Message[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const messagesApi = {
  /** Listar mensagens de uma conversa */
  list: (conversationId: string, params?: { page?: number; limit?: number }) =>
    apiFetch<MessageListResponse>("database/messages/" + conversationId, { params }),
  
  /** Obter última mensagem de uma conversa */
  getLast: (conversationId: string) =>
    apiFetch<Message>("database/messages/" + conversationId + "/last"),
  
  /** Contar mensagens de uma conversa */
  count: (conversationId: string) =>
    apiFetch<{ count: number }>("database/messages/" + conversationId + "/count"),
  
  /** Criar nova mensagem */
  create: (data: Omit<Message, "id" | "created_at">) =>
    apiFetch<Message>("database/messages", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  
  /** Criar múltiplas mensagens */
  createMany: (messages: Omit<Message, "id" | "created_at">[]) =>
    apiFetch<Message[]>("database/messages/batch", {
      method: "POST",
      body: JSON.stringify(messages),
    }),
  
  /** Obter mensagem por ID */
  get: (id: string) =>
    apiFetch<Message>("database/messages/" + id),
  
  /** Atualizar mensagem */
  update: (id: string, data: Partial<Omit<Message, "id" | "conversation_id" | "created_at">>) =>
    apiFetch<Message>("database/messages/" + id, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  
  /** Deletar mensagem */
  delete: (id: string) =>
    apiFetch<Message>("database/messages/" + id, {
      method: "DELETE",
    }),
  
  /** Deletar todas as mensagens de uma conversa */
  deleteByConversation: (conversationId: string) =>
    apiFetch<Message[]>("database/messages/conversation/" + conversationId, {
      method: "DELETE",
    }),
  
  /** Buscar mensagens por conteúdo */
  search: (query: string, limit?: number) =>
    apiFetch<Message[]>("database/messages/search", {
      params: { q: query, limit },
    }),
};

// ============================================================================
// USUÁRIOS
// ============================================================================

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  email_verified: boolean;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
}

const usersApi = {
  /** Obter dados do usuário autenticado */
  getMe: () => apiFetch<User>("database/users/me"),
  
  /** Atualizar dados do usuário autenticado */
  updateMe: (data: Partial<Omit<User, "id" | "email_verified" | "is_active" | "is_admin" | "created_at" | "updated_at" | "last_login_at">>) =>
    apiFetch<User>("database/users/me", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  
  /** Listar todos os usuários (admin) */
  list: (params?: { page?: number; limit?: number }) =>
    apiFetch<{ data: User[]; pagination: unknown }>("database/users", { params }),
  
  /** Obter usuário por ID */
  get: (id: string) =>
    apiFetch<User>("database/users/" + id),
  
  /** Criar novo usuário */
  create: (data: Omit<User, "id" | "email_verified" | "is_active" | "is_admin" | "created_at" | "updated_at" | "last_login_at">) =>
    apiFetch<User>("database/users", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  
  /** Atualizar usuário */
  update: (id: string, data: Partial<Omit<User, "id" | "email_verified" | "created_at" | "updated_at" | "last_login_at">>) =>
    apiFetch<User>("database/users/" + id, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  
  /** Deletar usuário */
  delete: (id: string) =>
    apiFetch<User>("database/users/" + id, {
      method: "DELETE",
    }),
  
  /** Buscar usuários */
  search: (query: string, limit?: number) =>
    apiFetch<User[]>("database/users/search", {
      params: { q: query, limit },
    }),
  
  /** Contar usuários */
  count: () => apiFetch<{ count: number }>("database/users/count"),
  
  /** Sincronizar usuário do Supabase */
  syncFromSupabase: (data: { email?: string; name?: string; avatar_url?: string }) =>
    apiFetch<User>("database/users/sync", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// ============================================================================
// TEMPLATES
// ============================================================================

export interface Template {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  type: "full-project" | "component" | "module" | "page" | "site";
  files: Array<{ path: string; content: string }>;
  category?: string;
  tags?: string[];
  is_public: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  usage_count: number;
  like_count: number;
}

const templatesApi = {
  /** Listar todos os templates */
  list: (params?: { page?: number; limit?: number; type?: string; category?: string; isPublic?: boolean; search?: string }) =>
    apiFetch<{ data: Template[]; pagination: unknown }>("database/templates", { params }),
  
  /** Listar templates populares */
  listPopular: (limit?: number) =>
    apiFetch<Template[]>("database/templates/popular", {
      params: { limit },
    }),
  
  /** Listar categorias */
  listCategories: () =>
    apiFetch<{ categories: string[] }>("database/templates/categories"),
  
  /** Listar tipos */
  listTypes: () =>
    apiFetch<{ types: string[] }>("database/templates/types"),
  
  /** Obter template por ID */
  get: (id: string) =>
    apiFetch<Template>("database/templates/" + id),
  
  /** Criar novo template */
  create: (data: Omit<Template, "id" | "user_id" | "created_at" | "updated_at" | "usage_count" | "like_count"> & { user_id: string }) =>
    apiFetch<Template>("database/templates", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  
  /** Atualizar template */
  update: (id: string, data: Partial<Omit<Template, "id" | "user_id" | "created_at" | "updated_at" | "usage_count" | "like_count">>) =>
    apiFetch<Template>("database/templates/" + id, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  
  /** Deletar template */
  delete: (id: string) =>
    apiFetch<Template>("database/templates/" + id, {
      method: "DELETE",
    }),
  
  /** Incrementar contador de uso */
  incrementUsage: (id: string) =>
    apiFetch<Template>("database/templates/" + id + "/increment-usage", {
      method: "PATCH",
    }),
  
  /** Incrementar contador de likes */
  incrementLikes: (id: string) =>
    apiFetch<Template>("database/templates/" + id + "/increment-likes", {
      method: "PATCH",
    }),
};

// ============================================================================
// SITES
// ============================================================================

export interface Site {
  id: string;
  user_id: string;
  name: string;
  domain?: string;
  status: "draft" | "building" | "deployed" | "error";
  template_id?: string;
  content: unknown;
  deploy_url?: string;
  deploy_provider?: string;
  deploy_id?: string;
  is_public: boolean;
  is_indexable: boolean;
  created_at: string;
  updated_at: string;
  deployed_at?: string;
  visits: number;
}

const sitesApi = {
  /** Listar todos os sites do usuário */
  list: (params?: { page?: number; limit?: number; status?: string; search?: string }) =>
    apiFetch<{ data: Site[]; pagination: unknown }>("database/sites", { params }),
  
  /** Listar sites públicos */
  listPublic: (params?: { page?: number; limit?: number }) =>
    apiFetch<{ data: Site[]; pagination: unknown }>("database/sites/public", { params }),
  
  /** Obter site por ID */
  get: (id: string) =>
    apiFetch<Site>("database/sites/" + id),
  
  /** Obter site por domain */
  getByDomain: (domain: string) =>
    apiFetch<Site>("database/sites/domain/" + domain),
  
  /** Criar novo site */
  create: (data: Omit<Site, "id" | "user_id" | "created_at" | "updated_at" | "deployed_at" | "visits"> & { user_id: string }) =>
    apiFetch<Site>("database/sites", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  
  /** Atualizar site */
  update: (id: string, data: Partial<Omit<Site, "id" | "user_id" | "created_at" | "deployed_at" | "visits">>) =>
    apiFetch<Site>("database/sites/" + id, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  
  /** Atualizar status de deploy */
  updateDeploy: (id: string, data: { status: Site["status"]; deploy_url?: string; deploy_provider?: string; deploy_id?: string }) =>
    apiFetch<Site>("database/sites/" + id + "/deploy", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  
  /** Incrementar contador de visitas */
  incrementVisits: (id: string) =>
    apiFetch<Site>("database/sites/" + id + "/increment-visits", {
      method: "PATCH",
    }),
  
  /** Deletar site */
  delete: (id: string) =>
    apiFetch<Site>("database/sites/" + id, {
      method: "DELETE",
    }),
  
  /** Contar sites por status */
  countByStatus: (userId: string) =>
    apiFetch<{ stats: Array<{ status: string; count: number }> }>("database/sites/" + userId + "/status"),
};

// ============================================================================
// CONTEÚDO
// ============================================================================

export interface Content {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  excerpt?: string;
  type: "article" | "post" | "page" | "documentation" | "tutorial";
  markdown_content?: string;
  html_content?: string;
  metadata?: unknown;
  status: "draft" | "published" | "archived";
  is_public: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  published_at?: string;
  views: number;
  likes: number;
  comments_count: number;
  seo_title?: string;
  seo_description?: string;
}

const contentApi = {
  /** Listar todo o conteúdo do usuário */
  list: (params?: { page?: number; limit?: number; type?: string; status?: string; search?: string }) =>
    apiFetch<{ data: Content[]; pagination: unknown }>("database/content", { params }),
  
  /** Listar conteúdo público */
  listPublic: (params?: { page?: number; limit?: number; type?: string; search?: string }) =>
    apiFetch<{ data: Content[]; pagination: unknown }>("database/content/public", { params }),
  
  /** Listar conteúdo mais recente */
  listRecent: (limit?: number) =>
    apiFetch<Content[]>("database/content/recent", {
      params: { limit },
    }),
  
  /** Listar conteúdo mais popular */
  listPopular: (limit?: number) =>
    apiFetch<Content[]>("database/content/popular", {
      params: { limit },
    }),
  
  /** Obter conteúdo por ID */
  get: (id: string) =>
    apiFetch<Content>("database/content/" + id),
  
  /** Obter conteúdo por slug */
  getBySlug: (slug: string) =>
    apiFetch<Content>("database/content/slug/" + slug),
  
  /** Criar novo conteúdo */
  create: (data: Omit<Content, "id" | "user_id" | "created_at" | "updated_at" | "published_at" | "views" | "likes" | "comments_count"> & { user_id: string }) =>
    apiFetch<Content>("database/content", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  
  /** Atualizar conteúdo */
  update: (id: string, data: Partial<Omit<Content, "id" | "user_id" | "created_at" | "published_at" | "views" | "likes" | "comments_count">>) =>
    apiFetch<Content>("database/content/" + id, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  
  /** Publicar conteúdo */
  publish: (id: string) =>
    apiFetch<Content>("database/content/" + id + "/publish", {
      method: "PATCH",
    }),
  
  /** Despublicar conteúdo */
  unpublish: (id: string) =>
    apiFetch<Content>("database/content/" + id + "/unpublish", {
      method: "PATCH",
    }),
  
  /** Incrementar contador de views */
  incrementViews: (id: string) =>
    apiFetch<Content>("database/content/" + id + "/increment-views", {
      method: "PATCH",
    }),
  
  /** Incrementar contador de likes */
  incrementLikes: (id: string) =>
    apiFetch<Content>("database/content/" + id + "/increment-likes", {
      method: "PATCH",
    }),
  
  /** Deletar conteúdo */
  delete: (id: string) =>
    apiFetch<Content>("database/content/" + id, {
      method: "DELETE",
    }),
  
  /** Contar conteúdo por tipo */
  countByType: (userId: string) =>
    apiFetch<{ stats: Array<{ type: string; count: number }> }>("database/content/" + userId + "/type"),
  
  /** Contar conteúdo por status */
  countByStatus: (userId: string) =>
    apiFetch<{ stats: Array<{ status: string; count: number }> }>("database/content/" + userId + "/status"),
};

// ============================================================================
// API KEYS
// ============================================================================

export interface ApiKey {
  id: string;
  user_id: string;
  name: string;
  key_prefix: string;
  permissions: string[];
  rate_limit: number;
  ip_whitelist?: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_used_at?: string;
  expires_at?: string;
  usage_count: number;
}

const apiKeysApi = {
  /** Listar todas as API keys do usuário */
  list: () => apiFetch<ApiKey[]>("database/api-keys"),
  
  /** Contar API keys do usuário */
  count: () => apiFetch<{ count: number }>("database/api-keys/count"),
  
  /** Obter API key por ID */
  get: (id: string) =>
    apiFetch<ApiKey>("database/api-keys/" + id),
  
  /** Criar nova API key */
  create: (data: Omit<ApiKey, "id" | "user_id" | "key" | "key_prefix" | "created_at" | "updated_at" | "last_used_at" | "usage_count"> & { user_id: string }) =>
    apiFetch<{ apiKey: ApiKey & { key: string }; warning: string }>("database/api-keys", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  
  /** Atualizar API key */
  update: (id: string, data: Partial<Omit<ApiKey, "id" | "user_id" | "key" | "key_prefix" | "created_at" | "updated_at" | "last_used_at" | "usage_count">>) =>
    apiFetch<ApiKey>("database/api-keys/" + id, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  
  /** Rotacionar API key */
  rotate: (id: string) =>
    apiFetch<{ apiKey: ApiKey & { key: string }; warning: string }>("database/api-keys/" + id + "/rotate", {
      method: "PATCH",
    }),
  
  /** Deletar API key */
  delete: (id: string) =>
    apiFetch<ApiKey>("database/api-keys/" + id, {
      method: "DELETE",
    }),
  
  /** Validar API key */
  validate: (key: string) =>
    apiFetch<{ valid: boolean; apiKey?: ApiKey; error?: string }>("database/api-keys/validate", {
      method: "POST",
      body: JSON.stringify({ key }),
    }),
};

// ============================================================================
// EXPORTS
// ============================================================================

export const api = {
  conversations: conversationsApi,
  messages: messagesApi,
  users: usersApi,
  templates: templatesApi,
  sites: sitesApi,
  content: contentApi,
  apiKeys: apiKeysApi,
  fetch: apiFetch,
};

export default api;
