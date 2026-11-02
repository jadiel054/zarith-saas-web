import { useState, useCallback, useEffect } from "react";
import { api } from "@/lib/api-client";
import type { Conversation, Message } from "@/lib/api-client";

export interface Session {
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

export interface ChatMessage {
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

export function useChatPersistence() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Função para sincronizar usuário do Supabase com o Neon
  const syncUser = useCallback(async () => {
    try {
      // Obter usuário do Supabase
      const { supabaseClient } = await import("@/lib/supabase");
      if (!supabaseClient) return;
      
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) return;
      
      // Sincronizar com o Neon
      await api.users.syncFromSupabase({
        email: user.email,
        name: user.user_metadata?.name,
        avatar_url: user.user_metadata?.avatar_url,
      });
    } catch (err) {
      console.error("Erro ao sincronizar usuário:", err);
    }
  }, []);

  const refreshSessions = useCallback(async () => {
    setIsLoadingSessions(true);
    setError(null);
    
    try {
      // Sincronizar usuário primeiro
      await syncUser();
      
      const response = await api.conversations.list({ limit: 50 });
      
      if (response.success && response.data) {
        setSessions(response.data.data);
      } else if (response.error) {
        setError(response.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar sessões");
      console.error("Erro ao carregar sessões:", err);
    } finally {
      setIsLoadingSessions(false);
    }
  }, [syncUser]);

  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const response = await api.messages.list(conversationId, { limit: 100 });
      
      if (response.success && response.data) {
        return response.data.data;
      }
      
      console.error("Erro ao carregar mensagens:", response.error);
      return [];
    } catch (err) {
      console.error("Erro ao carregar mensagens:", err);
      return [];
    }
  }, []);

  const createNewSession = useCallback(async (title?: string) => {
    try {
      const response = await api.conversations.create({
        title: title || "Nova conversa",
      });
      
      if (response.success && response.data) {
        setSessions(prev => [response.data, ...prev]);
        return response.data;
      }
      
      console.error("Erro ao criar sessão:", response.error);
      return null;
    } catch (err) {
      console.error("Erro ao criar sessão:", err);
      return null;
    }
  }, []);

  const saveChatMessage = useCallback(async (
    conversationId: string,
    role: "user" | "assistant" | "system",
    content: string,
    model?: string,
    toolCallId?: string,
    toolName?: string,
    toolArguments?: string,
    toolResult?: string
  ) => {
    try {
      // Incrementar contador de mensagens
      await api.conversations.incrementMessages(conversationId);
      
      const response = await api.messages.create({
        conversation_id: conversationId,
        role,
        content,
        model,
        tool_call_id: toolCallId,
        tool_name: toolName,
        tool_arguments: toolArguments,
        tool_result: toolResult,
      });
      
      if (!response.success) {
        console.error("Erro ao salvar mensagem:", response.error);
      }
      
      // Se for a primeira mensagem do usuário, atualiza o título da conversa
      if (role === "user") {
        const session = sessions.find(s => s.id === conversationId);
        if (session && (session.title === "Nova conversa" || !session.title)) {
          const newTitle = content.substring(0, 40);
          await api.conversations.update(conversationId, { title: newTitle });
          refreshSessions();
        }
      }
    } catch (err) {
      console.error("Erro ao salvar mensagem:", err);
    }
  }, [sessions, refreshSessions]);

  const renameSession = useCallback(async (id: string, title: string) => {
    try {
      const response = await api.conversations.update(id, { title });
      
      if (response.success && response.data) {
        setSessions(prev => prev.map(s => s.id === id ? response.data : s));
        return response.data;
      }
      
      console.error("Erro ao renomear sessão:", response.error);
      return null;
    } catch (err) {
      console.error("Erro ao renomear sessão:", err);
      return null;
    }
  }, []);

  const deleteSession = useCallback(async (id: string) => {
    try {
      const response = await api.conversations.delete(id);
      
      if (response.success) {
        setSessions(prev => prev.filter(s => s.id !== id));
        return true;
      }
      
      console.error("Erro ao deletar sessão:", response.error);
      return false;
    } catch (err) {
      console.error("Erro ao deletar sessão:", err);
      return false;
    }
  }, []);

  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      const response = await api.messages.delete(messageId);
      
      if (!response.success) {
        console.error("Erro ao deletar mensagem:", response.error);
        return false;
      }
      
      return true;
    } catch (err) {
      console.error("Erro ao deletar mensagem:", err);
      return false;
    }
  }, []);

  return {
    sessions,
    isLoadingSessions,
    error,
    refreshSessions,
    loadMessages,
    createNewSession,
    saveChatMessage,
    renameSession,
    deleteSession,
    deleteMessage,
  };
}
