/**
 * Sites Service
 * Gerencia sites criados pelo usuário
 */

import { db } from "@workspace/db";
import { sites, type Site, type NewSite } from "@workspace/db/src/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { sql } from "drizzle-orm";

export const sitesService = {
  /**
   * Listar todos os sites de um usuário
   */
  async listByUser(userId: string, options: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  } = {}) {
    const { page = 1, limit = 20, status, search } = options;
    
    let where = eq(sites.user_id, userId);
    
    if (status) {
      where = and(where, eq(sites.status, status));
    }
    
    if (search) {
      // @ts-ignore
      where = and(where, sql`(${sites.name} ILIKE ${`%${search}%`} OR ${sites.domain} ILIKE ${`%${search}%`})`);
    }
    
    const [data, [count]] = await Promise.all([
      db
        .select()
        .from(sites)
        .where(where)
        .orderBy(desc(sites.updated_at))
        .limit(limit)
        .offset((page - 1) * limit),
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(sites)
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
   * Obter site por ID
   */
  async getById(id: string, userId?: string) {
    let where = eq(sites.id, id);
    
    if (userId) {
      where = and(where, eq(sites.user_id, userId));
    }
    
    const [data] = await db
      .select()
      .from(sites)
      .where(where)
      .limit(1);
    
    return data || null;
  },

  /**
   * Obter site por domain
   */
  async getByDomain(domain: string) {
    const [data] = await db
      .select()
      .from(sites)
      .where(and(
        eq(sites.domain, domain),
        eq(sites.is_public, true),
        eq(sites.status, "deployed")
      ))
      .limit(1);
    
    return data || null;
  },

  /**
   * Criar novo site
   */
  async create(input: Omit<NewSite, "id" | "created_at" | "updated_at">) {
    const [data] = await db
      .insert(sites)
      .values({
        ...input,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .returning();
    
    return data;
  },

  /**
   * Atualizar site
   */
  async update(id: string, input: Partial<Omit<Site, "id" | "user_id" | "created_at" | "deployed_at">>, userId?: string) {
    let where = eq(sites.id, id);
    
    if (userId) {
      where = and(where, eq(sites.user_id, userId));
    }
    
    const [data] = await db
      .update(sites)
      .set({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .where(where)
      .returning();
    
    return data || null;
  },

  /**
   * Atualizar status de deploy
   */
  async updateDeployStatus(id: string, status: Site["status"], deployUrl?: string, deployId?: string) {
    const [data] = await db
      .update(sites)
      .set({
        status,
        deploy_url: deployUrl,
        deploy_id: deployId,
        deployed_at: status === "deployed" ? new Date().toISOString() : undefined,
        updated_at: new Date().toISOString(),
      })
      .where(eq(sites.id, id))
      .returning();
    
    return data || null;
  },

  /**
   * Incrementar contador de visitas
   */
  async incrementVisits(id: string) {
    const [data] = await db
      .update(sites)
      .set({
        visits: sql`${sites.visits} + 1`,
        updated_at: new Date().toISOString(),
      })
      .where(eq(sites.id, id))
      .returning();
    
    return data || null;
  },

  /**
   * Deletar site
   */
  async delete(id: string, userId?: string) {
    let where = eq(sites.id, id);
    
    if (userId) {
      where = and(where, eq(sites.user_id, userId));
    }
    
    const [data] = await db
      .delete(sites)
      .where(where)
      .returning();
    
    return data || null;
  },

  /**
   * Listar sites públicos
   */
  async listPublic(options: { page?: number; limit?: number } = {}) {
    const { page = 1, limit = 20 } = options;
    
    const [data, [count]] = await Promise.all([
      db
        .select()
        .from(sites)
        .where(and(
          eq(sites.is_public, true),
          eq(sites.status, "deployed")
        ))
        .orderBy(desc(sites.deployed_at))
        .limit(limit)
        .offset((page - 1) * limit),
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(sites)
        .where(and(
          eq(sites.is_public, true),
          eq(sites.status, "deployed")
        )),
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
   * Contar sites por status
   */
  async countByStatus(userId: string) {
    const results = await db
      .select({
        status: sites.status,
        count: sql<number>`COUNT(*)`,
      })
      .from(sites)
      .where(eq(sites.user_id, userId))
      .groupBy(sites.status);
    
    return results;
  },
};
