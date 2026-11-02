/**
 * Content Service
 * Gerencia conteúdo criado (artigos, posts, páginas)
 */

import { db, content, type Content, type NewContent } from "@workspace/db";
import { eq, and, desc, asc } from "drizzle-orm";
import { sql } from "drizzle-orm";

export const contentService = {
  /**
   * Listar todo o conteúdo de um usuário
   */
  async listByUser(userId: string, options: {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
    search?: string;
  } = {}) {
    const { page = 1, limit = 20, type, status, search } = options;
    
    let where = eq(content.user_id, userId);
    
    if (type) {
      where = and(where, eq(content.type, type));
    }
    
    if (status) {
      where = and(where, eq(content.status, status));
    }
    
    if (search) {
      // @ts-ignore
      where = and(where, sql`(${content.title} ILIKE ${`%${search}%`} OR ${content.excerpt} ILIKE ${`%${search}%`})`);
    }
    
    const [data, [count]] = await Promise.all([
      db
        .select()
        .from(content)
        .where(where)
        .orderBy(desc(content.published_at), desc(content.created_at))
        .limit(limit)
        .offset((page - 1) * limit),
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(content)
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
   * Obter conteúdo por ID
   */
  async getById(id: string, userId?: string) {
    let where = eq(content.id, id);
    
    if (userId) {
      where = and(where, eq(content.user_id, userId));
    }
    
    const [data] = await db
      .select()
      .from(content)
      .where(where)
      .limit(1);
    
    return data || null;
  },

  /**
   * Obter conteúdo por slug
   */
  async getBySlug(slug: string) {
    const [data] = await db
      .select()
      .from(content)
      .where(and(
        eq(content.slug, slug),
        or(
          eq(content.is_public, true),
          eq(content.status, "published")
        )
      ))
      .limit(1);
    
    return data || null;
  },

  /**
   * Criar novo conteúdo
   */
  async create(input: Omit<NewContent, "id" | "created_at" | "updated_at" | "published_at">) {
    const [data] = await db
      .insert(content)
      .values({
        ...input,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        published_at: input.status === "published" ? new Date().toISOString() : undefined,
      })
      .returning();
    
    return data;
  },

  /**
   * Atualizar conteúdo
   */
  async update(id: string, input: Partial<Omit<Content, "id" | "user_id" | "created_at" | "published_at">>, userId?: string) {
    let where = eq(content.id, id);
    
    if (userId) {
      where = and(where, eq(content.user_id, userId));
    }
    
    const updateData: Partial<Content> = {
      ...input,
      updated_at: new Date().toISOString(),
    };
    
    // Se status for publicado, definir published_at
    if (input.status === "published" && !input.published_at) {
      updateData.published_at = new Date().toISOString();
    }
    
    const [data] = await db
      .update(content)
      .set(updateData)
      .where(where)
      .returning();
    
    return data || null;
  },

  /**
   * Publicar conteúdo
   */
  async publish(id: string, userId?: string) {
    let where = eq(content.id, id);
    
    if (userId) {
      where = and(where, eq(content.user_id, userId));
    }
    
    const [data] = await db
      .update(content)
      .set({
        status: "published",
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .where(where)
      .returning();
    
    return data || null;
  },

  /**
   * Despublicar conteúdo
   */
  async unpublish(id: string, userId?: string) {
    let where = eq(content.id, id);
    
    if (userId) {
      where = and(where, eq(content.user_id, userId));
    }
    
    const [data] = await db
      .update(content)
      .set({
        status: "draft",
        published_at: null,
        updated_at: new Date().toISOString(),
      })
      .where(where)
      .returning();
    
    return data || null;
  },

  /**
   * Incrementar contador de views
   */
  async incrementViews(id: string) {
    const [data] = await db
      .update(content)
      .set({
        views: sql`${content.views} + 1`,
        updated_at: new Date().toISOString(),
      })
      .where(eq(content.id, id))
      .returning();
    
    return data || null;
  },

  /**
   * Incrementar contador de likes
   */
  async incrementLikes(id: string) {
    const [data] = await db
      .update(content)
      .set({
        likes: sql`${content.likes} + 1`,
        updated_at: new Date().toISOString(),
      })
      .where(eq(content.id, id))
      .returning();
    
    return data || null;
  },

  /**
   * Deletar conteúdo
   */
  async delete(id: string, userId?: string) {
    let where = eq(content.id, id);
    
    if (userId) {
      where = and(where, eq(content.user_id, userId));
    }
    
    const [data] = await db
      .delete(content)
      .where(where)
      .returning();
    
    return data || null;
  },

  /**
   * Listar conteúdo público
   */
  async listPublic(options: {
    page?: number;
    limit?: number;
    type?: string;
    search?: string;
  } = {}) {
    const { page = 1, limit = 20, type, search } = options;
    
    let where = and(
      eq(content.is_public, true),
      eq(content.status, "published")
    );
    
    if (type) {
      where = and(where, eq(content.type, type));
    }
    
    if (search) {
      // @ts-ignore
      where = and(where, sql`(${content.title} ILIKE ${`%${search}%`} OR ${content.excerpt} ILIKE ${`%${search}%`})`);
    }
    
    const [data, [count]] = await Promise.all([
      db
        .select()
        .from(content)
        .where(where)
        .orderBy(desc(content.published_at))
        .limit(limit)
        .offset((page - 1) * limit),
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(content)
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
   * Listar conteúdo mais recente
   */
  async listRecent(limit: number = 10) {
    const data = await db
      .select()
      .from(content)
      .where(and(
        eq(content.is_public, true),
        eq(content.status, "published")
      ))
      .orderBy(desc(content.published_at))
      .limit(limit);
    
    return data;
  },

  /**
   * Listar conteúdo mais popular
   */
  async listPopular(limit: number = 10) {
    const data = await db
      .select()
      .from(content)
      .where(and(
        eq(content.is_public, true),
        eq(content.status, "published")
      ))
      .orderBy(desc(content.views), desc(content.likes))
      .limit(limit);
    
    return data;
  },

  /**
   * Contar conteúdo por tipo
   */
  async countByType(userId: string) {
    const results = await db
      .select({
        type: content.type,
        count: sql<number>`COUNT(*)`,
      })
      .from(content)
      .where(eq(content.user_id, userId))
      .groupBy(content.type);
    
    return results;
  },

  /**
   * Contar conteúdo por status
   */
  async countByStatus(userId: string) {
    const results = await db
      .select({
        status: content.status,
        count: sql<number>`COUNT(*)`,
      })
      .from(content)
      .where(eq(content.user_id, userId))
      .groupBy(content.status);
    
    return results;
  },
};

// Helper para OR
import { or } from "drizzle-orm";
