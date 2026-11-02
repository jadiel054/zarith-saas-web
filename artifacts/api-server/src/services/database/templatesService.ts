/**
 * Templates Service
 * Gerencia templates para geração de código, sites e conteúdo
 */

import { db, templates, type Template, type NewTemplate } from "@workspace/db";
import { eq, and, desc, asc } from "drizzle-orm";
import { sql } from "drizzle-orm";

export const templatesService = {
  /**
   * Listar todos os templates
   */
  async listAll(options: {
    page?: number;
    limit?: number;
    userId?: string;
    type?: string;
    category?: string;
    isPublic?: boolean;
    search?: string;
  } = {}) {
    const { 
      page = 1, 
      limit = 50,
      userId,
      type,
      category,
      isPublic,
      search 
    } = options;
    
    let where = sql`TRUE`;
    
    if (userId) {
      where = and(where, sql`user_id = ${userId}`);
    }
    
    if (type) {
      where = and(where, eq(templates.type, type));
    }
    
    if (category) {
      where = and(where, eq(templates.category, category));
    }
    
    if (isPublic !== undefined) {
      where = and(where, eq(templates.is_public, isPublic));
    }
    
    if (search) {
      // @ts-ignore
      where = and(where, sql`(${templates.name} ILIKE ${`%${search}%`} OR ${templates.description} ILIKE ${`%${search}%`})`);
    }
    
    const [data, [count]] = await Promise.all([
      db
        .select()
        .from(templates)
        .where(where)
        .orderBy(desc(templates.created_at))
        .limit(limit)
        .offset((page - 1) * limit),
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(templates)
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
   * Listar templates populares
   */
  async listPopular(limit: number = 10) {
    const data = await db
      .select()
      .from(templates)
      .where(eq(templates.is_public, true))
      .orderBy(desc(templates.usage_count), desc(templates.like_count))
      .limit(limit);
    
    return data;
  },

  /**
   * Obter template por ID
   */
  async getById(id: string, userId?: string) {
    let where = eq(templates.id, id);
    
    if (userId) {
      where = and(where, or(
        eq(templates.user_id, userId),
        eq(templates.is_public, true)
      ));
    }
    
    const [data] = await db
      .select()
      .from(templates)
      .where(where)
      .limit(1);
    
    return data || null;
  },

  /**
   * Obter template por slug (se tivermos)
   */
  async getBySlug(slug: string) {
    // @ts-ignore - não temos slug na tabela, mas podemos adicionar
    const [data] = await db
      .select()
      .from(templates)
      .where(and(
        eq(templates.is_public, true),
        // @ts-ignore
        sql`name = ${slug}`
      ))
      .limit(1);
    
    return data || null;
  },

  /**
   * Criar novo template
   */
  async create(input: Omit<NewTemplate, "id" | "created_at" | "updated_at">) {
    const [data] = await db
      .insert(templates)
      .values({
        ...input,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .returning();
    
    return data;
  },

  /**
   * Atualizar template
   */
  async update(id: string, input: Partial<Omit<Template, "id" | "user_id" | "created_at">>, userId?: string) {
    let where = eq(templates.id, id);
    
    if (userId) {
      where = and(where, eq(templates.user_id, userId));
    }
    
    const [data] = await db
      .update(templates)
      .set({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .where(where)
      .returning();
    
    return data || null;
  },

  /**
   * Deletar template
   */
  async delete(id: string, userId?: string) {
    let where = eq(templates.id, id);
    
    if (userId) {
      where = and(where, eq(templates.user_id, userId));
    }
    
    const [data] = await db
      .delete(templates)
      .where(where)
      .returning();
    
    return data || null;
  },

  /**
   * Incrementar contador de uso
   */
  async incrementUsage(id: string) {
    const [data] = await db
      .update(templates)
      .set({
        usage_count: sql`${templates.usage_count} + 1`,
        updated_at: new Date().toISOString(),
      })
      .where(eq(templates.id, id))
      .returning();
    
    return data || null;
  },

  /**
   * Incrementar contador de likes
   */
  async incrementLikes(id: string) {
    const [data] = await db
      .update(templates)
      .set({
        like_count: sql`${templates.like_count} + 1`,
        updated_at: new Date().toISOString(),
      })
      .where(eq(templates.id, id))
      .returning();
    
    return data || null;
  },

  /**
   * Listar categorias únicas
   */
  async listCategories() {
    const results = await db
      .select({ category: templates.category })
      .from(templates)
      .where(and(
        eq(templates.is_public, true),
        sql`category IS NOT NULL`
      ))
      .groupBy(templates.category);
    
    return results.map(r => r.category).filter(Boolean) as string[];
  },

  /**
   * Listar tipos únicos
   */
  async listTypes() {
    const results = await db
      .select({ type: templates.type })
      .from(templates)
      .where(eq(templates.is_public, true))
      .groupBy(templates.type);
    
    return results.map(r => r.type) as string[];
  },
};

// Helper para OR
import { or } from "drizzle-orm";
