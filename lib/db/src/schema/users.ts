import { pgTable, text, uuid, timestamp, boolean } from "drizzle-orm/pg-core";

/**
 * Tabela de usuários do sistema
 * Compatível com Supabase Auth (se mantivermos) ou autenticação própria
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  avatar_url: text("avatar_url"),
  
  // Campos para autenticação própria (se não usar Supabase Auth)
  password_hash: text("password_hash"),
  email_verified: boolean("email_verified").default(false),
  
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
