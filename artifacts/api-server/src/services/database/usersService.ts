/**
 * Users Service — dados de usuário no Neon (Drizzle).
 * Auth nativo usa create + password_hash; login usa getByEmail.
 */

import { db, users, type User, type NewUser } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { sql } from "drizzle-orm";

export const usersService = {
  async listAll(options: { page?: number; limit?: number } = {}) {
    const { page = 1, limit = 50 } = options;

    const [data, [count]] = await Promise.all([
      db
        .select()
        .from(users)
        .orderBy(desc(users.created_at))
        .limit(limit)
        .offset((page - 1) * limit),
      db.select({ count: sql<number>`COUNT(*)` }).from(users),
    ]);

    const safeData = data.map((user) => ({
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

  async getById(id: string) {
    const [data] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!data) return null;
    return { ...data, password_hash: undefined };
  },

  async getByEmail(email: string) {
    const [data] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);
    return data || null;
  },

  async create(input: Omit<NewUser, "id" | "created_at" | "updated_at"> & { id?: string }) {
    const now = new Date();
    const values: NewUser = {
      ...input,
      email: input.email.toLowerCase(),
      created_at: now,
      updated_at: now,
    };
    if (input.id) {
      values.id = input.id;
    }

    const [data] = await db.insert(users).values(values).returning();
    if (!data) return null;
    return { ...data, password_hash: undefined };
  },

  async update(
    id: string,
    input: Partial<Omit<User, "id" | "created_at" | "password_hash">>
  ) {
    const [data] = await db
      .update(users)
      .set({
        ...input,
        email: input.email?.toLowerCase(),
        updated_at: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    if (!data) return null;
    return { ...data, password_hash: undefined };
  },

  async updatePassword(id: string, passwordHash: string) {
    const [data] = await db
      .update(users)
      .set({
        password_hash: passwordHash,
        updated_at: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return data || null;
  },

  async updateLastLogin(id: string) {
    const now = new Date();
    const [data] = await db
      .update(users)
      .set({
        last_login_at: now,
        updated_at: now,
      })
      .where(eq(users.id, id))
      .returning();
    return data || null;
  },

  async delete(id: string) {
    const [data] = await db.delete(users).where(eq(users.id, id)).returning();
    return data || null;
  },

  async emailExists(email: string) {
    const [data] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);
    return !!data;
  },

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
          sql`(${users.name} ILIKE ${`%${query}%`} OR ${users.email} ILIKE ${`%${query}%`})`
        )
      )
      .orderBy(desc(users.created_at))
      .limit(limit);
    return results;
  },

  async count() {
    const [result] = await db.select({ count: sql<number>`COUNT(*)` }).from(users);
    return result?.count || 0;
  },

  async syncFromSupabase(supabaseUser: {
    id: string;
    email: string;
    name?: string;
    avatar_url?: string;
  }) {
    const existingUser = await this.getById(supabaseUser.id);
    if (existingUser) {
      return this.update(supabaseUser.id, {
        email: supabaseUser.email,
        name: supabaseUser.name,
        avatar_url: supabaseUser.avatar_url,
      });
    }
    return this.create({
      id: supabaseUser.id,
      email: supabaseUser.email,
      name: supabaseUser.name,
      avatar_url: supabaseUser.avatar_url,
      email_verified: true,
      is_active: true,
    });
  },
};
