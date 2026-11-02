/**
 * Conversations Service
 * Serviço para gerenciamento de conversas usando API Client
 * 
 * NOTA: Este serviço substitui o antigo que usava Supabase direto
 * Agora usa o API Client para comunicar com o backend
 */

import { api } from "@/lib/api-client";
import type { Conversation } from "@/lib/api-client";

export interface ConversationType extends Conversation {}

export const conversationsService = {
  async listConversations() {
    const response = await api.conversations.list({ limit: 50 });
    
    if (response.success && response.data) {
      return { data: response.data.data as ConversationType[], error: null };
    }
    
    return { data: null, error: new Error(response.error || "Erro ao listar conversas") };
  },

  async createConversation(title: string = "Nova conversa") {
    const response = await api.conversations.create({ title });
    
    if (response.success && response.data) {
      return { data: response.data as ConversationType, error: null };
    }
    
    return { data: null, error: new Error(response.error || "Erro ao criar conversa") };
  },

  async updateConversation(id: string, title: string) {
    const response = await api.conversations.update(id, { title });
    
    if (response.success && response.data) {
      return { data: response.data as ConversationType, error: null };
    }
    
    return { data: null, error: new Error(response.error || "Erro ao atualizar conversa") };
  },

  async deleteConversation(id: string) {
    const response = await api.conversations.delete(id);
    
    if (response.success) {
      return { error: null };
    }
    
    return { error: new Error(response.error || "Erro ao deletar conversa") };
  }
};
