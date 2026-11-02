import { pgTable, text, uuid, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { users } from "./users";
import { relations } from "drizzle-orm";

/**
 * Tabela de templates para geração de código, sites, conteúdo
 */
export const templates = pgTable("templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  
  // Informações básicas
  name: text("name").notNull(),
  description: text("description"),
  
  // Tipo do template
  type: text("type", { 
    enum: ["full-project", "component", "module", "page", "site"] 
  }).notNull().default("component"),
  
  // Conteúdo do template (JSON com estrutura de arquivos)
  files: jsonb("files").notNull().$type<{ path: string; content: string }[]>(),
  
  // Metadados
  category: text("category"),
  tags: text("tags").array(),
  
  // Controle de visibilidade
  is_public: boolean("is_public").default(false),
  is_featured: boolean("is_featured").default(false),
  
  // Timestamps
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  
  // Contadores
  usage_count: integer("usage_count").default(0),
  like_count: integer("like_count").default(0),
});

// Relacionamentos
export const templatesRelations = relations(templates, ({ one }) => ({
  user: one(users, {
    fields: [templates.user_id],
    references: [users.id],
  }),
}));

export type Template = typeof templates.$inferSelect;
export type NewTemplate = typeof templates.$inferInsert;
