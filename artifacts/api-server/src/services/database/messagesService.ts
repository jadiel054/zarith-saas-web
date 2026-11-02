/**
 * Messages Service
 * Gerencia mensagens do chat usando Drizzle ORM
 */

import { db } from "@workspace/db";
import { messages, type Message, type NewMessage } from "@workspace/db/src/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { sql } from "drizzle-orm";

export interface MessageWithTokens extends Message {
  token_count: number;
}

export const messagesService = {
  /**
   * Listar mensagens de uma conversa
   */
  async listByConversation(conversationId: string, options: {
    page?: number;
    limit?: number;
  } = {}) {
    const { page = 1, limit = 100 } = options;
    
    const [data, [count]] = await Promise.all([
      db
        .select()
        .from(messages)
        .where(eq(messages.conversation_id, conversationId))
        .orderBy(asc(messages.created_at))
        .limit(limit)
        .offset((page - 1) * limit),
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(messages)
        .where(eq(messages.conversation_id, conversationId)),
    ]);
    
    return {
      data,
      pagination: {
        page,
        limit,
        total: count?.count || 0,
        totalPages: Math.ceil((count?.count || 0) / limit),
      },
    };
  },

  /**
   * Obter mensagem por ID
   */
  async getById(id: string) {
    const [data] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, id))
      .limit(1);
    
    return data || null;
  },

  /**
   * Criar nova mensagem
   */
  async create(input: NewMessage) {
    const [data] = await db
      .insert(messages)
      .values(input)
      .returning();
    
    // Atualizar contador de mensagens na conversa
    await db
      .update(sql`conversations`)
      .set({
        messages_count: sql`messages_count + 1`,
        updated_at: new Date().toISOString(),
      })
      .where(eq(sql`conversations.id`, input.conversation_id));
    
    return data;
  },

  /**
   * Criar múltiplas mensagens
   */
  async createMany(input: NewMessage[]) {
    if (input.length === 0) return [];
    
    const data = await db
      .insert(messages)
      .values(input)
      .returning();
    
    // Atualizar contador para cada conversa
    const conversationIds = [...new Set(input.map(m => m.conversation_id))];
    
    for (const convId of conversationIds) {
      const count = input.filter(m => m.conversation_id === convId).length;
      await db
        .update(sql`conversations`)
        .set({
          messages_count: sql`messages_count + ${count}`,
          updated_at: new Date().toISOString(),
        })
        .where(eq(sql`conversations.id`, convId));
    }
    
    return data;
  },

  /**
   * Atualizar mensagem
   */
  async update(id: string, input: Partial<Omit<Message, "id" | "conversation_id" | "created_at">>) {
    const [data] = await db
      .update(messages)
      .set(input)
      .where(eq(messages.id, id))
      .returning();
    
    return data || null;
  },

  /**
   * Deletar mensagem
   */
  async delete(id: string) {
    const [data] = await db
      .delete(messages)
      .where(eq(messages.id, id))
      .returning();
    
    // Atualizar contador de mensagens na conversa
    if (data) {
      await db
        .update(sql`conversations`)
        .set({
          messages_count: sql`messages_count - 1`,
          updated_at: new Date().toISOString(),
        })
        .where(eq(sql`conversations.id`, data.conversation_id));
    }
    
    return data || null;
  },

  /**
   * Deletar todas as mensagens de uma conversa
   */
  async deleteByConversation(conversationId: string) {
    const data = await db
      .delete(messages)
      .where(eq(messages.conversation_id, conversationId))
      .returning();
    
    // Resetar contador de mensagens
    await db
      .update(sql`conversations`)
      .set({
        messages_count: 0,
        updated_at: new Date().toISOString(),
      })
      .where(eq(sql`conversations.id`, conversationId));
    
    return data;
  },

  /**
   * Obter última mensagem de uma conversa
   */
  async getLastByConversation(conversationId: string) {
    const [data] = await db
      .select()
      .from(messages)
      .where(eq(messages.conversation_id, conversationId))
      .orderBy(desc(messages.created_at))
      .limit(1);
    
    return data || null;
  },

  /**
   * Contar mensagens de uma conversa
   */
  async countByConversation(conversationId: string) {
    const [result] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(messages)
      .where(eq(messages.conversation_id, conversationId));
    
    return result?.count || 0;
  },

  /**
   * Buscar mensagens por conteúdo
   */
  async searchByContent(query: string, userId: string, limit: number = 20) {
    // @ts-ignore - drizzle-orm não tem suporte nativo para LIKE
    const results = await db
      .select({
        id: messages.id,
        conversation_id: messages.conversation_id,
        role: messages.role,
        content: messages.content,
        created_at: messages.created_at,
      })
      .from(messages)
      .where(and(
        // @ts-ignore
        sql`${messages.content} ILIKE ${`%${query}%`}`,
        // Verificar se a conversa pertence ao usuário
        sql`EXISTS (SELECT 1 FROM conversations WHERE id = ${messages.conversation_id} AND user_id = ${userId})`
      ))
      .orderBy(desc(messages.created_at))
      .limit(limit);
    
    return results;
  },
};
