import { useState, useCallback, useEffect } from "react";
import { conversationsService, Conversation } from "@/services/database/conversations";
import { messagesService, DBMessage } from "@/services/database/messages";

export function useChatPersistence() {
  const [sessions, setSessions] = useState<Conversation[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  const refreshSessions = useCallback(async () => {
    setIsLoadingSessions(true);
    const { data, error } = await conversationsService.listConversations();
    if (!error && data) {
      setSessions(data);
    }
    setIsLoadingSessions(false);
  }, []);

  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

  const loadMessages = useCallback(async (conversationId: string) => {
    const { data, error } = await messagesService.listMessages(conversationId);
    if (error) {
      console.error("Erro ao carregar mensagens:", error);
      return [];
    }
    return data || [];
  }, []);

  const createNewSession = useCallback(async (title?: string) => {
    const { data, error } = await conversationsService.createConversation(title);
    if (error || !data) {
      console.error("Erro ao criar sessão:", error);
      return null;
    }
    setSessions(prev => [data, ...prev]);
    return data;
  }, []);

  const saveChatMessage = useCallback(async (conversationId: string, role: "user" | "assistant" | "system", content: string, model?: string) => {
    const { error } = await messagesService.saveMessage(conversationId, role, content, model);
    if (error) {
      console.error("Erro ao salvar mensagem:", error);
    }
    
    // Se for a primeira mensagem do usuário, atualiza o título da conversa
    if (role === "user") {
      const session = sessions.find(s => s.id === conversationId);
      if (session && (session.title === "Nova conversa" || !session.title)) {
        const newTitle = content.substring(0, 40);
        await conversationsService.updateConversation(conversationId, newTitle);
        refreshSessions();
      }
    }
  }, [sessions, refreshSessions]);

  const deleteSession = useCallback(async (id: string) => {
    const { error } = await conversationsService.deleteConversation(id);
    if (!error) {
      setSessions(prev => prev.filter(s => s.id !== id));
    } else {
      console.error("Erro ao deletar sessão:", error);
    }
  }, []);

  return {
    sessions,
    isLoadingSessions,
    refreshSessions,
    loadMessages,
    createNewSession,
    saveChatMessage,
    deleteSession
  };
}
