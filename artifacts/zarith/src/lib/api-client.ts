/**
 * API Client para o Zarith
 * Cliente HTTP para comunicar com o backend (Neon + auth nativo)
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
  const defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Token nativo Zarith (login/cadastro via Neon)
  try {
    const zarithToken = localStorage.getItem("zarith-auth-token");
    if (zarithToken) {
      defaultHeaders["Authorization"] = `Bearer ${zarithToken}`;
    } else {
      // Legado Supabase (se ainda existir sessão antiga)
      const supabaseToken = localStorage.getItem("supabase-auth-token");
      if (supabaseToken) {
        try {
          const token = JSON.parse(supabaseToken).access_token;
          if (token) defaultHeaders["Authorization"] = `Bearer ${token}`;
        } catch {
          /* ignore */
        }
      }
    }
  } catch {
    /* ignore SSR */
  }

  return { ...defaultHeaders, ...(headers as Record<string, string> | undefined) };
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
  list: (params?: { page?: number; limit?: number; search?: string }) =>
    apiFetch<ConversationListResponse>("database/conversations", { params }),
  get: (id: string) => apiFetch<Conversation>("database/conversations/" + id),
  create: (data: { title?: string; model?: string; temperature?: string }) =>
    apiFetch<Conversation>("database/conversations", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<Omit<Conversation, "id" | "user_id" | "created_at">>) =>
    apiFetch<Conversation>("database/conversations/" + id, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    apiFetch<Conversation>("database/conversations/" + id, { method: "DELETE" }),
  incrementMessages: (id: string) =>
    apiFetch<Conversation>("database/conversations/" + id + "/increment-messages", {
      method: "PATCH",
    }),
  updateTokens: (id: string, tokens: number) =>
    apiFetch<Conversation>("database/conversations/" + id + "/tokens", {
      method: "PATCH",
      body: JSON.stringify({ tokens }),
    }),
};

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
  list: (conversationId: string, params?: { page?: number; limit?: number }) =>
    apiFetch<MessageListResponse>("database/messages/" + conversationId, { params }),
  getLast: (conversationId: string) =>
    apiFetch<Message>("database/messages/" + conversationId + "/last"),
  count: (conversationId: string) =>
    apiFetch<{ count: number }>("database/messages/" + conversationId + "/count"),
  create: (data: Omit<Message, "id" | "created_at">) =>
    apiFetch<Message>("database/messages", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  createMany: (messages: Omit<Message, "id" | "created_at">[]) =>
    apiFetch<Message[]>("database/messages/batch", {
      method: "POST",
      body: JSON.stringify(messages),
    }),
  get: (id: string) => apiFetch<Message>("database/messages/" + id),
  update: (id: string, data: Partial<Omit<Message, "id" | "conversation_id" | "created_at">>) =>
    apiFetch<Message>("database/messages/" + id, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    apiFetch<Message>("database/messages/" + id, { method: "DELETE" }),
  deleteByConversation: (conversationId: string) =>
    apiFetch<Message[]>("database/messages/conversation/" + conversationId, {
      method: "DELETE",
    }),
  search: (query: string, limit?: number) =>
    apiFetch<Message[]>("database/messages/search", {
      params: { q: query, limit },
    }),
};

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
  getMe: () => apiFetch<User>("database/users/me"),
  updateMe: (data: Partial<Omit<User, "id" | "email_verified" | "is_active" | "is_admin" | "created_at" | "updated_at" | "last_login_at">>) =>
    apiFetch<User>("database/users/me", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  list: (params?: { page?: number; limit?: number }) =>
    apiFetch<{ data: User[]; pagination: unknown }>("database/users", { params }),
  get: (id: string) => apiFetch<User>("database/users/" + id),
  create: (data: Omit<User, "id" | "email_verified" | "is_active" | "is_admin" | "created_at" | "updated_at" | "last_login_at">) =>
    apiFetch<User>("database/users", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<Omit<User, "id" | "email_verified" | "created_at" | "updated_at" | "last_login_at">>) =>
    apiFetch<User>("database/users/" + id, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    apiFetch<User>("database/users/" + id, { method: "DELETE" }),
  search: (query: string, limit?: number) =>
    apiFetch<User[]>("database/users/search", {
      params: { q: query, limit },
    }),
  count: () => apiFetch<{ count: number }>("database/users/count"),
  syncFromSupabase: (data: { email?: string; name?: string; avatar_url?: string }) =>
    apiFetch<User>("database/users/sync", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

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
  list: (params?: {
    page?: number;
    limit?: number;
    type?: string;
    category?: string;
    isPublic?: boolean;
    search?: string;
  }) => apiFetch<{ data: Template[]; pagination: unknown }>("database/templates", { params }),
  listPopular: (limit?: number) =>
    apiFetch<Template[]>("database/templates/popular", { params: { limit } }),
  listCategories: () => apiFetch<{ categories: string[] }>("database/templates/categories"),
  listTypes: () => apiFetch<{ types: string[] }>("database/templates/types"),
  get: (id: string) => apiFetch<Template>("database/templates/" + id),
  create: (
    data: Omit<
      Template,
      "id" | "user_id" | "created_at" | "updated_at" | "usage_count" | "like_count"
    > & { user_id: string }
  ) =>
    apiFetch<Template>("database/templates", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (
    id: string,
    data: Partial<
      Omit<
        Template,
        "id" | "user_id" | "created_at" | "updated_at" | "usage_count" | "like_count"
      >
    >
  ) =>
    apiFetch<Template>("database/templates/" + id, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    apiFetch<Template>("database/templates/" + id, { method: "DELETE" }),
  incrementUsage: (id: string) =>
    apiFetch<Template>("database/templates/" + id + "/increment-usage", {
      method: "PATCH",
    }),
  incrementLikes: (id: string) =>
    apiFetch<Template>("database/templates/" + id + "/increment-likes", {
      method: "PATCH",
    }),
};

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
  list: (params?: { page?: number; limit?: number; status?: string; search?: string }) =>
    apiFetch<{ data: Site[]; pagination: unknown }>("database/sites", { params }),
  listPublic: (params?: { page?: number; limit?: number }) =>
    apiFetch<{ data: Site[]; pagination: unknown }>("database/sites/public", { params }),
  get: (id: string) => apiFetch<Site>("database/sites/" + id),
  getByDomain: (domain: string) => apiFetch<Site>("database/sites/domain/" + domain),
  create: (
    data: Omit<
      Site,
      "id" | "user_id" | "created_at" | "updated_at" | "deployed_at" | "visits"
    > & { user_id: string }
  ) =>
    apiFetch<Site>("database/sites", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (
    id: string,
    data: Partial<Omit<Site, "id" | "user_id" | "created_at" | "deployed_at" | "visits">>
  ) =>
    apiFetch<Site>("database/sites/" + id, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  updateDeploy: (
    id: string,
    data: {
      status: Site["status"];
      deploy_url?: string;
      deploy_provider?: string;
      deploy_id?: string;
    }
  ) =>
    apiFetch<Site>("database/sites/" + id + "/deploy", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  incrementVisits: (id: string) =>
    apiFetch<Site>("database/sites/" + id + "/increment-visits", { method: "PATCH" }),
  delete: (id: string) => apiFetch<Site>("database/sites/" + id, { method: "DELETE" }),
  countByStatus: (userId: string) =>
    apiFetch<{ stats: Array<{ status: string; count: number }> }>(
      "database/sites/" + userId + "/status"
    ),
};

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
  list: (params?: {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
    search?: string;
  }) => apiFetch<{ data: Content[]; pagination: unknown }>("database/content", { params }),
  listPublic: (params?: { page?: number; limit?: number; type?: string; search?: string }) =>
    apiFetch<{ data: Content[]; pagination: unknown }>("database/content/public", { params }),
  listRecent: (limit?: number) =>
    apiFetch<Content[]>("database/content/recent", { params: { limit } }),
  listPopular: (limit?: number) =>
    apiFetch<Content[]>("database/content/popular", { params: { limit } }),
  get: (id: string) => apiFetch<Content>("database/content/" + id),
  getBySlug: (slug: string) => apiFetch<Content>("database/content/slug/" + slug),
  create: (
    data: Omit<
      Content,
      | "id"
      | "user_id"
      | "created_at"
      | "updated_at"
      | "published_at"
      | "views"
      | "likes"
      | "comments_count"
    > & { user_id: string }
  ) =>
    apiFetch<Content>("database/content", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (
    id: string,
    data: Partial<
      Omit<
        Content,
        | "id"
        | "user_id"
        | "created_at"
        | "published_at"
        | "views"
        | "likes"
        | "comments_count"
      >
    >
  ) =>
    apiFetch<Content>("database/content/" + id, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  publish: (id: string) =>
    apiFetch<Content>("database/content/" + id + "/publish", { method: "PATCH" }),
  unpublish: (id: string) =>
    apiFetch<Content>("database/content/" + id + "/unpublish", { method: "PATCH" }),
  incrementViews: (id: string) =>
    apiFetch<Content>("database/content/" + id + "/increment-views", { method: "PATCH" }),
  incrementLikes: (id: string) =>
    apiFetch<Content>("database/content/" + id + "/increment-likes", { method: "PATCH" }),
  delete: (id: string) => apiFetch<Content>("database/content/" + id, { method: "DELETE" }),
  countByType: (userId: string) =>
    apiFetch<{ stats: Array<{ type: string; count: number }> }>(
      "database/content/" + userId + "/type"
    ),
  countByStatus: (userId: string) =>
    apiFetch<{ stats: Array<{ status: string; count: number }> }>(
      "database/content/" + userId + "/status"
    ),
};

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
  list: () => apiFetch<ApiKey[]>("database/api-keys"),
  count: () => apiFetch<{ count: number }>("database/api-keys/count"),
  get: (id: string) => apiFetch<ApiKey>("database/api-keys/" + id),
  create: (
    data: Omit<
      ApiKey,
      | "id"
      | "user_id"
      | "key"
      | "key_prefix"
      | "created_at"
      | "updated_at"
      | "last_used_at"
      | "usage_count"
    > & { user_id: string }
  ) =>
    apiFetch<{ apiKey: ApiKey & { key: string }; warning: string }>("database/api-keys", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (
    id: string,
    data: Partial<
      Omit<
        ApiKey,
        | "id"
        | "user_id"
        | "key"
        | "key_prefix"
        | "created_at"
        | "updated_at"
        | "last_used_at"
        | "usage_count"
      >
    >
  ) =>
    apiFetch<ApiKey>("database/api-keys/" + id, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  rotate: (id: string) =>
    apiFetch<{ apiKey: ApiKey & { key: string }; warning: string }>(
      "database/api-keys/" + id + "/rotate",
      { method: "PATCH" }
    ),
  delete: (id: string) =>
    apiFetch<ApiKey>("database/api-keys/" + id, { method: "DELETE" }),
  validate: (key: string) =>
    apiFetch<{ valid: boolean; apiKey?: ApiKey; error?: string }>("database/api-keys/validate", {
      method: "POST",
      body: JSON.stringify({ key }),
    }),
};

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
