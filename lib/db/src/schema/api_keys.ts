import { pgTable, text, uuid, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { users } from "./users";
import { relations } from "drizzle-orm";

/**
 * Tabela de API keys para integrações externas
 */
export const api_keys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  
  // Informações da chave
  name: text("name").notNull(),
  key: text("key").notNull().unique(), // Hash da chave real
  key_prefix: text("key_prefix").notNull(), // Prefixo para identificação
  
  // Permissões
  permissions: text("permissions").array().notNull().$type<string[]>(),
  
  // Restrições
  rate_limit: integer("rate_limit").default(100), // Requests por minuto
  ip_whitelist: text("ip_whitelist").array().$type<string[]>(),
  
  // Status
  is_active: boolean("is_active").default(true),
  
  // Timestamps
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  last_used_at: timestamp("last_used_at"),
  expires_at: timestamp("expires_at"),
  
  // Contadores
  usage_count: integer("usage_count").default(0),
});

// Relacionamentos
export const apiKeysRelations = relations(api_keys, ({ one }) => ({
  user: one(users, {
    fields: [api_keys.user_id],
    references: [users.id],
  }),
}));

export type ApiKey = typeof api_keys.$inferSelect;
export type NewApiKey = typeof api_keys.$inferInsert;
