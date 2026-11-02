/**
 * Users Service
 * Gerencia usuários usando Drizzle ORM
 * 
 * Autenticação nativa implementada
 */

import { db, users, type User, type NewUser } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { sql } from "drizzle-orm";

export const usersService = {
  /**
   * Listar todos os usuários (apenas para admin)
   */
  async listAll(options: { page?: number; limit?: number } = {}) {
    const { page = 1, limit = 50 } = options;
    
    const [data, [count]] = await Promise.all([
      db
        .select()
        .from(users)
        .orderBy(desc(users.created_at))
        .limit(limit)
        .offset((page - 1) * limit),
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(users),
    ]);
    
    // Remover senhas dos resultados
    const safeData = data.map(user => ({
      ...user,
      password_hash: undefined,
    }));
    
    return {
      data: safeData,
      pagination: {
        page,
        limit,
        total: count?.count || 0,
        totalPages: Math.ceil((count?.count || 0) / limit),
      },
    };
  },

  /**
   * Obter usuário por ID
   */
  async getById(id: string) {
    const [data] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    
    if (!data) return null;
    
    // Remover senha
    return {
      ...data,
      password_hash: undefined,
    };
  },

  /**
   * Obter usuário por email
   */
  async getByEmail(email: string) {
    const [data] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);
    
    return data || null;
  },

  /**
   * Criar novo usuário
   */
  async create(input: Omit<NewUser, "id" | "created_at" | "updated_at">) {
    const [data] = await db
      .insert(users)
      .values({
        ...input,
        email: input.email.toLowerCase(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .returning();
    
    if (!data) return null;
    
    // Remover senha
    return {
      ...data,
      password_hash: undefined,
    };
  },

  /**
   * Atualizar usuário
   */
  async update(id: string, input: Partial<Omit<User, "id" | "created_at" | "password_hash">>) {
    const [data] = await db
      .update(users)
      .set({
        ...input,
        email: input.email?.toLowerCase(),
        updated_at: new Date().toISOString(),
      })
      .where(eq(users.id, id))
      .returning();
    
    if (!data) return null;
    
    // Remover senha
    return {
      ...data,
      password_hash: undefined,
    };
  },

  /**
   * Atualizar senha
   */
  async updatePassword(id: string, passwordHash: string) {
    const [data] = await db
      .update(users)
      .set({
        password_hash: passwordHash,
        updated_at: new Date().toISOString(),
      })
      .where(eq(users.id, id))
      .returning();
    
    return data || null;
  },

  /**
   * Atualizar data do último login
   */
  async updateLastLogin(id: string) {
    const [data] = await db
      .update(users)
      .set({
        last_login_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .where(eq(users.id, id))
      .returning();
    
    return data || null;
  },

  /**
   * Deletar usuário
   * NOTA: Isso vai deletar todas as conversas, mensagens, sites, etc. do usuário
   * por causa das constraints ON DELETE CASCADE
   */
  async delete(id: string) {
    const [data] = await db
      .delete(users)
      .where(eq(users.id, id))
      .returning();
    
    return data || null;
  },

  /**
   * Verificar se email existe
   */
  async emailExists(email: string) {
    const [data] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);
    
    return !!data;
  },

  /**
   * Buscar usuários por nome ou email
   */
  async search(query: string, limit: number = 10) {
    const results = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        avatar_url: users.avatar_url,
        created_at: users.created_at,
      })
      .from(users)
      .where(
        and(
          // @ts-ignore - drizzle-orm não tem suporte nativo para ILIKE
          sql`(${users.name} ILIKE ${`%${query}%`} OR ${users.email} ILIKE ${`%${query}%`})`
        )
      )
      .orderBy(desc(users.created_at))
      .limit(limit);
    
    return results;
  },

  /**
   * Contar usuários
   */
  async count() {
    const [result] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(users);
    
    return result?.count || 0;
  },


};
