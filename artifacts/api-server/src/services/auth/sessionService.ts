/**
 * Session Service
 * Serviço para gerenciamento de sessões de usuário
 */

import { db } from "@workspace/db";
import { sessions, type Session, type NewSession } from "@workspace/db/src/schema";
import { eq, and } from "drizzle-orm";
import * as crypto from "node:crypto";

// Configuração de sessão
const SESSION_DURATION = process.env.SESSION_EXPIRES_IN || "7d"; // 7 dias padrão
const SESSION_TOKEN_LENGTH = 64; // 64 bytes = 128 caracteres hex

// Converter duração para milissegundos
function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000; // 7 dias padrão
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  switch (unit) {
    case "s": return value * 1000;
    case "m": return value * 60 * 1000;
    case "h": return value * 60 * 60 * 1000;
    case "d": return value * 24 * 60 * 60 * 1000;
    default: return 7 * 24 * 60 * 60 * 1000;
  }
}

const sessionDurationMs = parseDuration(SESSION_DURATION);

// Gerar token de sessão
function generateSessionToken(): string {
  return crypto.randomBytes(SESSION_TOKEN_LENGTH).toString("hex");
}

export const sessionService = {
  /**
   * Criar nova sessão
   */
  async create(userId: string, ipAddress?: string, userAgent?: string): Promise<Session> {
    // Invalidar sessões antigas do usuário
    await this.invalidateUserSessions(userId);
    
    const token = generateSessionToken();
    const expiresAt = new Date(Date.now() + sessionDurationMs);
    
    const [session] = await db
      .insert(sessions)
      .values({
        user_id: userId,
        token,
        expires_at: expiresAt.toISOString(),
        ip_address: ipAddress,
        user_agent: userAgent,
      })
      .returning();
    
    return session;
  },

  /**
   * Obter sessão por token
   */
  async getByToken(token: string): Promise<Session | null> {
    const [session] = await db
      .select()
      .from(sessions)
      .where(and(
        eq(sessions.token, token),
        eq(sessions.is_active, true)
      ))
      .limit(1);
    
    if (!session) return null;
    
    // Verificar se expirou
    if (new Date(session.expires_at) < new Date()) {
      await this.invalidate(session.id);
      return null;
    }
    
    return session;
  },

  /**
   * Obter sessões de um usuário
   */
  async getByUserId(userId: string): Promise<Session[]> {
    const activeSessions = await db
      .select()
      .from(sessions)
      .where(and(
        eq(sessions.user_id, userId),
        eq(sessions.is_active, true)
      ))
      .orderBy(sessions.created_at);
    
    // Filtrar sessões expiradas
    const now = new Date();
    return activeSessions.filter(s => new Date(s.expires_at) >= now);
  },

  /**
   * Invalidar sessão
   */
  async invalidate(sessionId: string): Promise<void> {
    await db
      .update(sessions)
      .set({ is_active: false })
      .where(eq(sessions.id, sessionId));
  },

  /**
   * Invalidar todas as sessões de um usuário
   */
  async invalidateUserSessions(userId: string): Promise<void> {
    await db
      .update(sessions)
      .set({ is_active: false })
      .where(eq(sessions.user_id, userId));
  },

  /**
   * Invalidar sessões expiradas
   */
  async invalidateExpired(): Promise<number> {
    const now = new Date().toISOString();
    
    const result = await db
      .update(sessions)
      .set({ is_active: false })
      .where(and(
        eq(sessions.is_active, true),
        // @ts-ignore - drizzle-orm não tem suporte nativo para comparação de timestamps
        sql`${sessions.expires_at} < ${now}`
      ));
    
    return result.rowCount || 0;
  },

  /**
   * Atualizar sessão (refresh)
   */
  async refresh(sessionId: string): Promise<Session | null> {
    const session = await this.getByToken(sessionId);
    if (!session) return null;
    
    const newExpiresAt = new Date(Date.now() + sessionDurationMs);
    
    const [updatedSession] = await db
      .update(sessions)
      .set({ expires_at: newExpiresAt.toISOString() })
      .where(eq(sessions.id, sessionId))
      .returning();
    
    return updatedSession || null;
  },

  /**
   * Deletar sessão
   */
  async delete(sessionId: string): Promise<void> {
    await db
      .delete(sessions)
      .where(eq(sessions.id, sessionId));
  },

  /**
   * Contar sessões ativas
   */
  async countActive(): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(sessions)
      .where(eq(sessions.is_active, true));
    
    return result?.count || 0;
  },
};

// Helper para SQL raw
import { sql } from "drizzle-orm";
