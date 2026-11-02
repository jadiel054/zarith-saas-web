import { pgTable, text, uuid, timestamp, boolean } from "drizzle-orm/pg-core";

/**
 * Tabela de usuários do sistema
 * Autenticação nativa (sem Supabase)
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  avatar_url: text("avatar_url"),
  
  // Campos para autenticação própria
  password_hash: text("password_hash").notNull(),
  email_verified: boolean("email_verified").default(false),
  email_verification_token: text("email_verification_token"),
  email_verification_token_expires: timestamp("email_verification_token_expires"),
  
  // Recuperação de senha
  password_reset_token: text("password_reset_token"),
  password_reset_token_expires: timestamp("password_reset_token_expires"),
  
  // Metadados
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  last_login_at: timestamp("last_login_at"),
  
  // Status da conta
  is_active: boolean("is_active").default(true),
  is_admin: boolean("is_admin").default(false),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
