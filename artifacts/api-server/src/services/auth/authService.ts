/**
 * Auth Service
 * Serviço principal de autenticação nativa
 * Integra password, session e email services
 */

import { db } from "@workspace/db";
import { users, sessions, password_reset_tokens, type User, type Session } from "@workspace/db/src/schema";
import { eq, and } from "drizzle-orm";
import { passwordService } from "./passwordService";
import { sessionService } from "./sessionService";
import { emailService } from "./emailService";
import * as crypto from "node:crypto";
import { sql } from "drizzle-orm";

// Configurações
const PASSWORD_RESET_EXPIRES_IN = process.env.PASSWORD_RESET_EXPIRES_IN || "1h"; // 1 hora padrão
const EMAIL_VERIFICATION_EXPIRES_IN = process.env.EMAIL_VERIFICATION_EXPIRES_IN || "24h"; // 24 horas padrão

// Converter duração para milissegundos
function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) return 24 * 60 * 60 * 1000; // 24 horas padrão
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  switch (unit) {
    case "s": return value * 1000;
    case "m": return value * 60 * 1000;
    case "h": return value * 60 * 60 * 1000;
    case "d": return value * 24 * 60 * 60 * 1000;
    default: return 24 * 60 * 60 * 1000;
  }
}

const passwordResetExpiresMs = parseDuration(PASSWORD_RESET_EXPIRES_IN);
const emailVerificationExpiresMs = parseDuration(EMAIL_VERIFICATION_EXPIRES_IN);

// Gerar token aleatório
function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString("hex");
}

export interface RegisterInput {
  email: string;
  password: string;
  name?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResult {
  user: Omit<User, "password_hash">;
  session: Omit<Session, "user_id">;
  accessToken: string;
}

export interface PasswordResetResult {
  success: boolean;
  message: string;
}

export const authService = {
  /**
   * Registrar novo usuário
   */
  async register(input: RegisterInput, ipAddress?: string, userAgent?: string): Promise<AuthResult> {
    // Validar entrada
    if (!input.email || !input.password) {
      throw new Error("Email e senha são obrigatórios");
    }
    
    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input.email)) {
      throw new Error("Email inválido");
    }
    
    // Verificar se email já existe
    const existingUser = await this.getUserByEmail(input.email);
    if (existingUser) {
      throw new Error("Este email já está em uso");
    }
    
    // Validar força da senha
    const passwordValidation = passwordService.validatePasswordStrength(input.password);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.errors.join(", "));
    }
    
    // Hash da senha
    const passwordHash = await passwordService.hashPassword(input.password);
    
    // Gerar token de verificação de email
    const emailVerificationToken = generateToken();
    const emailVerificationExpires = new Date(Date.now() + emailVerificationExpiresMs);
    
    // Criar usuário
    const [newUser] = await db
      .insert(users)
      .values({
        id: crypto.randomUUID(),
        email: input.email.toLowerCase(),
        name: input.name || input.email.split("@")[0],
        password_hash: passwordHash,
        email_verified: false,
        email_verification_token: emailVerificationToken,
        email_verification_token_expires: emailVerificationExpires.toISOString(),
        is_active: true,
        is_admin: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .returning();
    
    if (!newUser) {
      throw new Error("Falha ao criar usuário");
    }
    
    // Criar sessão
    const session = await sessionService.create(newUser.id, ipAddress, userAgent);
    
    // Enviar email de verificação
    try {
      await emailService.sendVerificationEmail(
        newUser.email,
        newUser.name || newUser.email,
        emailVerificationToken
      );
    } catch (emailError) {
      console.error("Falha ao enviar email de verificação:", emailError);
      // Não falhar o registro por causa do email
    }
    
    // Remover campos sensíveis
    const safeUser = {
      ...newUser,
      password_hash: undefined,
      email_verification_token: undefined,
      email_verification_token_expires: undefined,
      password_reset_token: undefined,
      password_reset_token_expires: undefined,
    };
    
    const safeSession = {
      ...session,
      user_id: undefined,
    };
    
    return {
      user: safeUser,
      session: safeSession,
      accessToken: session.token,
    };
  },

  /**
   * Login do usuário
   */
  async login(input: LoginInput, ipAddress?: string, userAgent?: string): Promise<AuthResult> {
    // Validar entrada
    if (!input.email || !input.password) {
      throw new Error("Email e senha são obrigatórios");
    }
    
    // Obter usuário
    const user = await this.getUserByEmail(input.email);
    if (!user) {
      throw new Error("Credenciais inválidas");
    }
    
    // Verificar senha
    const isValidPassword = await passwordService.verifyPassword(input.password, user.password_hash);
    if (!isValidPassword) {
      throw new Error("Credenciais inválidas");
    }
    
    // Verificar se usuário está ativo
    if (!user.is_active) {
      throw new Error("Conta desativada");
    }
    
    // Criar sessão
    const session = await sessionService.create(user.id, ipAddress, userAgent);
    
    // Atualizar último login
    await db
      .update(users)
      .set({
        last_login_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .where(eq(users.id, user.id));
    
    // Remover campos sensíveis
    const safeUser = {
      ...user,
      password_hash: undefined,
      email_verification_token: undefined,
      email_verification_token_expires: undefined,
      password_reset_token: undefined,
      password_reset_token_expires: undefined,
    };
    
    const safeSession = {
      ...session,
      user_id: undefined,
    };
    
    return {
      user: safeUser,
      session: safeSession,
      accessToken: session.token,
    };
  },

  /**
   * Logout do usuário
   */
  async logout(sessionToken: string): Promise<void> {
    const session = await sessionService.getByToken(sessionToken);
    if (session) {
      await sessionService.invalidate(session.id);
    }
  },

  /**
   * Obter usuário por email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);
    
    return user || null;
  },

  /**
   * Obter usuário por ID
   */
  async getUserById(id: string): Promise<User | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    
    return user || null;
  },

  /**
   * Verificar token de verificação de email
   */
  async verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
    // Buscar usuário com este token
    const [user] = await db
      .select()
      .from(users)
      .where(and(
        eq(users.email_verification_token, token),
        // @ts-ignore - drizzle-orm não tem suporte nativo para comparação de timestamps
        sql`${users.email_verification_token_expires} > NOW()`
      ))
      .limit(1);
    
    if (!user) {
      return { success: false, message: "Token inválido ou expirado" };
    }
    
    // Marcar email como verificado
    await db
      .update(users)
      .set({
        email_verified: true,
        email_verification_token: null,
        email_verification_token_expires: null,
        updated_at: new Date().toISOString(),
      })
      .where(eq(users.id, user.id));
    
    return { success: true, message: "Email verificado com sucesso" };
  },

  /**
   * Solicitar recuperação de senha
   */
  async forgotPassword(email: string, ipAddress?: string): Promise<{ success: boolean; message: string }> {
    // Obter usuário
    const user = await this.getUserByEmail(email);
    if (!user) {
      // Não revelar que o email não existe por segurança
      return { success: true, message: "Se o email existir, um link de recuperação foi enviado" };
    }
    
    // Gerar token de recuperação
    const resetToken = generateToken();
    const resetTokenExpires = new Date(Date.now() + passwordResetExpiresMs);
    
    // Armazenar token
    await db
      .insert(password_reset_tokens)
      .values({
        id: crypto.randomUUID(),
        user_id: user.id,
        token: resetToken,
        expires_at: resetTokenExpires.toISOString(),
        used: false,
        created_at: new Date().toISOString(),
      });
    
    // Enviar email
    try {
      await emailService.sendResetPasswordEmail(
        user.email,
        user.name || user.email,
        resetToken
      );
    } catch (emailError) {
      console.error("Falha ao enviar email de recuperação:", emailError);
      return { success: false, message: "Falha ao enviar email de recuperação" };
    }
    
    return { success: true, message: "Link de recuperação enviado para seu email" };
  },

  /**
   * Resetar senha
   */
  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    // Buscar token de recuperação
    const [resetToken] = await db
      .select()
      .from(password_reset_tokens)
      .where(and(
        eq(password_reset_tokens.token, token),
        eq(password_reset_tokens.used, false),
        // @ts-ignore - drizzle-orm não tem suporte nativo para comparação de timestamps
        sql`${password_reset_tokens.expires_at} > NOW()`
      ))
      .limit(1);
    
    if (!resetToken) {
      return { success: false, message: "Token inválido ou expirado" };
    }
    
    // Validar força da nova senha
    const passwordValidation = passwordService.validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      return { success: false, message: passwordValidation.errors.join(", ") };
    }
    
    // Hash da nova senha
    const passwordHash = await passwordService.hashPassword(newPassword);
    
    // Atualizar senha do usuário
    await db
      .update(users)
      .set({
        password_hash: passwordHash,
        updated_at: new Date().toISOString(),
      })
      .where(eq(users.id, resetToken.user_id));
    
    // Marcar token como usado
    await db
      .update(password_reset_tokens)
      .set({ used: true })
      .where(eq(password_reset_tokens.id, resetToken.id));
    
    // Invalidar todas as sessões do usuário
    await sessionService.invalidateUserSessions(resetToken.user_id);
    
    return { success: true, message: "Senha redefinida com sucesso" };
  },

  /**
   * Obter usuário atual a partir da sessão
   */
  async getCurrentUser(sessionToken: string): Promise<Omit<User, "password_hash"> | null> {
    const session = await sessionService.getByToken(sessionToken);
    if (!session) {
      return null;
    }
    
    const user = await this.getUserById(session.user_id);
    if (!user) {
      return null;
    }
    
    // Remover campos sensíveis
    return {
      ...user,
      password_hash: undefined,
      email_verification_token: undefined,
      email_verification_token_expires: undefined,
      password_reset_token: undefined,
      password_reset_token_expires: undefined,
    };
  },

  /**
   * Atualizar senha do usuário autenticado
   */
  async updatePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const user = await this.getUserById(userId);
    if (!user) {
      return { success: false, message: "Usuário não encontrado" };
    }
    
    // Verificar senha atual
    const isValidPassword = await passwordService.verifyPassword(currentPassword, user.password_hash);
    if (!isValidPassword) {
      return { success: false, message: "Senha atual inválida" };
    }
    
    // Validar força da nova senha
    const passwordValidation = passwordService.validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      return { success: false, message: passwordValidation.errors.join(", ") };
    }
    
    // Hash da nova senha
    const passwordHash = await passwordService.hashPassword(newPassword);
    
    // Atualizar senha
    await db
      .update(users)
      .set({
        password_hash: passwordHash,
        updated_at: new Date().toISOString(),
      })
      .where(eq(users.id, userId));
    
    // Invalidar todas as sessões do usuário
    await sessionService.invalidateUserSessions(userId);
    
    return { success: true, message: "Senha atualizada com sucesso" };
  },

  /**
   * Atualizar perfil do usuário
   */
  async updateProfile(userId: string, input: { name?: string; avatar_url?: string }): Promise<Omit<User, "password_hash"> | null> {
    const user = await this.getUserById(userId);
    if (!user) {
      return null;
    }
    
    const [updatedUser] = await db
      .update(users)
      .set({
        name: input.name,
        avatar_url: input.avatar_url,
        updated_at: new Date().toISOString(),
      })
      .where(eq(users.id, userId))
      .returning();
    
    if (!updatedUser) {
      return null;
    }
    
    // Remover campos sensíveis
    return {
      ...updatedUser,
      password_hash: undefined,
      email_verification_token: undefined,
      email_verification_token_expires: undefined,
      password_reset_token: undefined,
      password_reset_token_expires: undefined,
    };
  },

  /**
   * Reenviar email de verificação
   */
  async resendVerificationEmail(email: string): Promise<{ success: boolean; message: string }> {
    const user = await this.getUserByEmail(email);
    if (!user) {
      return { success: false, message: "Usuário não encontrado" };
    }
    
    if (user.email_verified) {
      return { success: false, message: "Email já verificado" };
    }
    
    // Gerar novo token
    const emailVerificationToken = generateToken();
    const emailVerificationExpires = new Date(Date.now() + emailVerificationExpiresMs);
    
    // Atualizar token
    await db
      .update(users)
      .set({
        email_verification_token: emailVerificationToken,
        email_verification_token_expires: emailVerificationExpires.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .where(eq(users.id, user.id));
    
    // Enviar email
    try {
      await emailService.sendVerificationEmail(
        user.email,
        user.name || user.email,
        emailVerificationToken
      );
    } catch (emailError) {
      console.error("Falha ao enviar email de verificação:", emailError);
      return { success: false, message: "Falha ao enviar email de verificação" };
    }
    
    return { success: true, message: "Email de verificação reenviado" };
  },

  /**
   * Verificar se email já está em uso (para validação no frontend)
   */
  async isEmailAvailable(email: string): Promise<boolean> {
    const user = await this.getUserByEmail(email);
    return !user;
  },
};
