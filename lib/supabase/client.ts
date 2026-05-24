/**
 * Cliente Supabase para autenticação e operações de banco de dados
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Cliente público (para o navegador)
export const supabaseClient: SupabaseClient | null = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Cliente de serviço (apenas servidor)
export const supabaseServiceClient: SupabaseClient | null = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

/**
 * Trocar código OAuth por token
 */
export async function exchangeCodeForToken(code: string) {
  if (!supabaseServiceClient) {
    throw new Error("Service client não disponível");
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabaseServiceClient as any;

  const { data, error } = await client.auth.exchangeCodeForSession(code);

  if (error) {
    throw new Error(`OAuth exchange failed: ${error.message}`);
  }

  return data.session;
}

/**
 * Obter usuário atual
 */
export async function getCurrentUser() {
  if (!supabaseClient) throw new Error("Supabase client not initialized");
  const { data, error } = await supabaseClient.auth.getUser();

  if (error) {
    throw new Error(`Failed to get user: ${error.message}`);
  }

  return data.user;
}

/**
 * Fazer logout
 */
export async function logout() {
  if (!supabaseClient) throw new Error("Supabase client not initialized");
  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    throw new Error(`Logout failed: ${error.message}`);
  }
}

/**
 * Criar usuário no schema zarith
 */
export async function createZarithUser(
  authUserId: string,
  email: string,
  displayName?: string,
  avatarUrl?: string
) {
  if (!supabaseServiceClient) {
    throw new Error("Service client não disponível");
  }

  const { data, error } = await supabaseServiceClient
    .from("users")
    .insert([
      {
        auth_user_id: authUserId,
        email,
        display_name: displayName,
        avatar_url: avatarUrl,
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create user: ${error.message}`);
  }

  return data;
}

/**
 * Obter usuário do schema zarith
 */
export async function getZarithUser(authUserId: string) {
  if (!supabaseClient) throw new Error("Supabase client not initialized");
  const { data, error } = await supabaseClient
    .from("users")
    .select("*")
    .eq("auth_user_id", authUserId)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = não encontrado
    throw new Error(`Failed to get user: ${error.message}`);
  }

  return data;
}

/**
 * Obter configurações do usuário
 */
export async function getUserSettings(userId: string) {
  if (!supabaseClient) throw new Error("Supabase client not initialized");
  const { data, error } = await supabaseClient
    .from("settings")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") {
    throw new Error(`Failed to get settings: ${error.message}`);
  }

  return data;
}

/**
 * Atualizar configurações do usuário
 */
export async function updateUserSettings(userId: string, settings: Record<string, unknown>) {
  if (!supabaseClient) throw new Error("Supabase client not initialized");
  const { data, error } = await supabaseClient
    .from("settings")
    .update(settings)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update settings: ${error.message}`);
  }

  return data;
}

/**
 * Criar nova sessão de chat
 */
export async function createChat(userId: string, title: string = "Nova conversa") {
  if (!supabaseClient) throw new Error("Supabase client not initialized");
  const { data, error } = await supabaseClient
    .from("chats")
    .insert([{ user_id: userId, title }])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create chat: ${error.message}`);
  }

  return data;
}

/**
 * Listar chats do usuário
 */
export async function getUserChats(userId: string) {
  if (!supabaseClient) throw new Error("Supabase client not initialized");
  const { data, error } = await supabaseClient
    .from("chats")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to get chats: ${error.message}`);
  }

  return data;
}

/**
 * Adicionar mensagem ao chat
 */
export async function addMessage(
  chatId: string,
  role: "user" | "assistant" | "system",
  content: string,
  modelUsed?: string
) {
  if (!supabaseClient) throw new Error("Supabase client not initialized");
  const { data, error } = await supabaseClient
    .from("messages")
    .insert([
      {
        chat_id: chatId,
        role,
        content,
        model_used: modelUsed,
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to add message: ${error.message}`);
  }

  return data;
}

/**
 * Obter mensagens do chat
 */
export async function getChatMessages(chatId: string) {
  if (!supabaseClient) throw new Error("Supabase client not initialized");
  const { data, error } = await supabaseClient
    .from("messages")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to get messages: ${error.message}`);
  }

  return data;
}
