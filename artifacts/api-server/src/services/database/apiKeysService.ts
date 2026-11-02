/**
 * API Keys Service
 * Gerencia API keys para integrações externas
 */

import { db, api_keys, type ApiKey, type NewApiKey } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { sql } from "drizzle-orm";
import * as crypto from "node:crypto";

// Gerar chave aleatória
function generateRandomKey(): { key: string; prefix: string } {
  const prefix = `zarith_${crypto.randomBytes(4).toString("hex")}`;
  const key = `${prefix}_${crypto.randomBytes(16).toString("base64url")}`;
  return { key, prefix };
}

// Hash da chave para armazenamento
async function hashKey(key: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(key, salt, 100000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

// Verificar chave
async function verifyKey(storedHash: string, key: string): Promise<boolean> {
  const [salt, hash] = storedHash.split(":");
  const newHash = crypto.pbkdf2Sync(key, salt, 100000, 64, "sha512").toString("hex");
  return newHash === hash;
}

export const apiKeysService = {
  /**
   * Listar todas as API keys de um usuário
   */
  async listByUser(userId: string) {
    const data = await db
      .select({
        id: api_keys.id,
        name: api_keys.name,
        key_prefix: api_keys.key_prefix,
        permissions: api_keys.permissions,
        rate_limit: api_keys.rate_limit,
        ip_whitelist: api_keys.ip_whitelist,
        is_active: api_keys.is_active,
        created_at: api_keys.created_at,
        last_used_at: api_keys.last_used_at,
        expires_at: api_keys.expires_at,
        usage_count: api_keys.usage_count,
      })
      .from(api_keys)
      .where(eq(api_keys.user_id, userId))
      .orderBy(desc(api_keys.created_at));
    
    return data;
  },

  /**
   * Obter API key por ID
   */
  async getById(id: string, userId?: string) {
    let where = eq(api_keys.id, id);
    
    if (userId) {
      where = and(where, eq(api_keys.user_id, userId));
    }
    
    const [data] = await db
      .select()
      .from(api_keys)
      .where(where)
      .limit(1);
    
    return data || null;
  },

  /**
   * Obter API key por prefix
   */
  async getByPrefix(prefix: string) {
    const [data] = await db
      .select()
      .from(api_keys)
      .where(and(
        eq(api_keys.key_prefix, prefix),
        eq(api_keys.is_active, true)
      ))
      .limit(1);
    
    return data || null;
  },

  /**
   * Criar nova API key
   */
  async create(input: Omit<NewApiKey, "id" | "user_id" | "key" | "key_prefix" | "created_at" | "updated_at"> & { user_id: string }) {
    // Gerar chave aleatória
    const { key, prefix } = generateRandomKey();
    
    // Hash da chave para armazenamento
    const keyHash = await hashKey(key);
    
    const [data] = await db
      .insert(api_keys)
      .values({
        ...input,
        user_id: input.user_id,
        key: keyHash,
        key_prefix: prefix,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .returning();
    
    return {
      ...data,
      key, // Retornar a chave original (apenas uma vez!)
    };
  },

  /**
   * Atualizar API key
   */
  async update(id: string, input: Partial<Omit<ApiKey, "id" | "user_id" | "key" | "key_prefix" | "created_at">>, userId?: string) {
    let where = eq(api_keys.id, id);
    
    if (userId) {
      where = and(where, eq(api_keys.user_id, userId));
    }
    
    const [data] = await db
      .update(api_keys)
      .set({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .where(where)
      .returning();
    
    return data || null;
  },

  /**
   * Deletar API key
   */
  async delete(id: string, userId?: string) {
    let where = eq(api_keys.id, id);
    
    if (userId) {
      where = and(where, eq(api_keys.user_id, userId));
    }
    
    const [data] = await db
      .delete(api_keys)
      .where(where)
      .returning();
    
    return data || null;
  },

  /**
   * Validar API key
   */
  async validate(key: string, ip?: string): Promise<{ valid: boolean; apiKey?: ApiKey; error?: string }> {
    // Extrair prefix da chave
    const prefix = key.split("_")[0] + "_" + key.split("_")[1];
    
    const apiKey = await this.getByPrefix(prefix);
    
    if (!apiKey) {
      return { valid: false, error: "API key not found" };
    }
    
    if (!apiKey.is_active) {
      return { valid: false, error: "API key is inactive" };
    }
    
    // Verificar expiração
    if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
      return { valid: false, error: "API key has expired" };
    }
    
    // Verificar IP whitelist
    if (apiKey.ip_whitelist && apiKey.ip_whitelist.length > 0 && ip) {
      if (!apiKey.ip_whitelist.includes(ip)) {
        return { valid: false, error: "IP not whitelisted" };
      }
    }
    
    // Verificar hash
    const isValid = await verifyKey(apiKey.key, key);
    
    if (!isValid) {
      return { valid: false, error: "Invalid API key" };
    }
    
    // Atualizar data de último uso
    await db
      .update(api_keys)
      .set({
        last_used_at: new Date().toISOString(),
        usage_count: sql`${api_keys.usage_count} + 1`,
      })
      .where(eq(api_keys.id, apiKey.id));
    
    return { valid: true, apiKey };
  },

  /**
   * Verificar permissões
   */
  hasPermission(apiKey: ApiKey, permission: string): boolean {
    return apiKey.permissions.includes("*") || apiKey.permissions.includes(permission);
  },

  /**
   * Gerar nova chave (rotacionar)
   */
  async rotate(id: string, userId?: string): Promise<{ key: string; apiKey: ApiKey } | null> {
    let where = eq(api_keys.id, id);
    
    if (userId) {
      where = and(where, eq(api_keys.user_id, userId));
    }
    
    // Gerar nova chave
    const { key, prefix } = generateRandomKey();
    const keyHash = await hashKey(key);
    
    const [data] = await db
      .update(api_keys)
      .set({
        key: keyHash,
        key_prefix: prefix,
        updated_at: new Date().toISOString(),
      })
      .where(where)
      .returning();
    
    if (!data) return null;
    
    return {
      key,
      apiKey: data,
    };
  },

  /**
   * Contar API keys de um usuário
   */
  async countByUser(userId: string) {
    const [result] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(api_keys)
      .where(eq(api_keys.user_id, userId));
    
    return result?.count || 0;
  },
};
