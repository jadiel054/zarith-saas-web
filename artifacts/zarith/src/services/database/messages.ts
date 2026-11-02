/**
 * Messages Service
 * Serviço para gerenciamento de mensagens usando API Client
 * 
 * NOTA: Este serviço substitui o antigo que usava Supabase direto
 * Agora usa o API Client para comunicar com o backend
 */

import { api } from "@/lib/api-client";
import type { Message } from "@/lib/api-client";

export interface DBMessage extends Message {}

export const messagesService = {
  async listMessages(conversationId: string) {
    const response = await api.messages.list(conversationId, { limit: 100 });
    
    if (response.success && response.data) {
      return { data: response.data.data as DBMessage[], error: null };
    }
    
    return { data: null, error: new Error(response.error || "Erro ao listar mensagens") };
  },

  async saveMessage(
    conversationId: string,
    role: "user" | "assistant" | "system",
    content: string,
    model?: string,
    toolCallId?: string,
    toolName?: string,
    toolArguments?: string,
    toolResult?: string
  ) {
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
    
    if (response.success && response.data) {
      return { data: response.data as DBMessage, error: null };
    }
    
    return { data: null, error: new Error(response.error || "Erro ao salvar mensagem") };
  },

  async deleteMessage(messageId: string) {
    const response = await api.messages.delete(messageId);
    
    if (response.success) {
      return { error: null };
    }
    
    return { error: new Error(response.error || "Erro ao deletar mensagem") };
  }
};
