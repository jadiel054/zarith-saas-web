/**
 * Password Service
 * Serviço para gerenciamento de senhas com hash seguro
 */

import argon2 from "argon2";

// Configuração do Argon2id (recomendado para segurança)
const argon2Options = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64MB
  timeCost: 3,      // 3 iterações
  parallelism: 1,   // 1 thread
};

// Configuração para hash mais rápido (para testes)
const fastOptions = {
  type: argon2.argon2id,
  memoryCost: 16384, // 16MB
  timeCost: 2,
  parallelism: 1,
};

// Usar configuração rápida em desenvolvimento
const isProduction = process.env.NODE_ENV === "production";
const hashOptions = isProduction ? argon2Options : fastOptions;

export const passwordService = {
  /**
   * Hash de senha
   */
  async hashPassword(password: string): Promise<string> {
    if (!password || password.length < 8) {
      throw new Error("Senha deve ter pelo menos 8 caracteres");
    }
    
    const hash = await argon2.hash(password, hashOptions);
    return hash;
  },

  /**
   * Verificar senha
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password, hashOptions);
    } catch {
      return false;
    }
  },

  /**
   * Gerar hash rápido (para testes)
   */
  async hashPasswordFast(password: string): Promise<string> {
    const hash = await argon2.hash(password, fastOptions);
    return hash;
  },

  /**
   * Validar força da senha
   */
  validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!password || password.length < 8) {
      errors.push("Senha deve ter pelo menos 8 caracteres");
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push("Senha deve conter pelo menos uma letra maiúscula");
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push("Senha deve conter pelo menos uma letra minúscula");
    }
    
    if (!/[0-9]/.test(password)) {
      errors.push("Senha deve conter pelo menos um número");
    }
    
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push("Senha deve conter pelo menos um caractere especial");
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  },

  /**
   * Gerar senha aleatória
   */
  generateRandomPassword(length: number = 12): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+";
    let password = "";
    
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      password += chars[randomIndex];
    }
    
    return password;
  },
};
