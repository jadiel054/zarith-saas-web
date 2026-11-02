/**
 * Conversations Service
 * Gerencia conversas (sessões de chat) usando Drizzle ORM
 */

import { db, conversations, type Conversation, type NewConversation } from "@workspace/db";
import { eq, and, desc, asc } from "drizzle-orm";

export interface ConversationWithCount extends Conversation {
  messages_count: number;
}

export const conversationsService = {
  /**
   * Listar todas as conversas de um usuário
   */
  async listByUser(userId: string, options: {
    page?: number;
    limit?: number;
    search?: string;
  } = {}) {
    const { page = 1, limit = 50, search } = options;
    
    const where = eq(conversations.user_id, userId);
    
    if (search) {
      // Busca por título
      // @ts-ignore - drizzle-orm não tem suporte nativo para LIKE
      where.and(sql`${conversations.title} ILIKE ${`%${search}%`}`);
    }
    
    const [data, [count]] = await Promise.all([
      db
        .select()
        .from(conversations)
        .where(where)
        .orderBy(desc(conversations.updated_at))
        .limit(limit)
        .offset((page - 1) * limit),
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(conversations)
        .where(where),
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
   * Obter conversa por ID
   */
  async getById(id: string, userId?: string) {
    const where = userId ? and(eq(conversations.id, id), eq(conversations.user_id, userId)) : eq(conversations.id, id);
    
    const [data] = await db
      .select()
      .from(conversations)
      .where(where)
      .limit(1);
    
    return data || null;
  },

  /**
   * Criar nova conversa
   */
  async create(input: Omit<NewConversation, "user_id"> & { user_id: string }) {
    const [data] = await db
      .insert(conversations)
      .values(input)
      .returning();
    
    return data;
  },

  /**
   * Atualizar conversa
   */
  async update(id: string, input: Partial<Omit<Conversation, "id" | "user_id" | "created_at">>, userId?: string) {
    const where = userId ? and(eq(conversations.id, id), eq(conversations.user_id, userId)) : eq(conversations.id, id);
    
    const [data] = await db
      .update(conversations)
      .set({ ...input, updated_at: new Date().toISOString() })
      .where(where)
      .returning();
    
    return data || null;
  },

  /**
   * Deletar conversa
   */
  async delete(id: string, userId?: string) {
    const where = userId ? and(eq(conversations.id, id), eq(conversations.user_id, userId)) : eq(conversations.id, id);
    
    const [data] = await db
      .delete(conversations)
      .where(where)
      .returning();
    
    return data || null;
  },

  /**
   * Incrementar contador de mensagens
   */
  async incrementMessagesCount(id: string) {
    const [data] = await db
      .update(conversations)
      .set({
        messages_count: sql`${conversations.messages_count} + 1`,
        updated_at: new Date().toISOString(),
      })
      .where(eq(conversations.id, id))
      .returning();
    
    return data || null;
  },

  /**
   * Atualizar tokens usados
   */
  async updateTokensUsed(id: string, tokens: number) {
    const [data] = await db
      .update(conversations)
      .set({
        tokens_used: sql`${conversations.tokens_used} + ${tokens}`,
        updated_at: new Date().toISOString(),
      })
      .where(eq(conversations.id, id))
      .returning();
    
    return data || null;
  },
};

// Helper para SQL raw
import { sql } from "drizzle-orm";
