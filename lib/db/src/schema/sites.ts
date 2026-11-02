import { pgTable, text, uuid, timestamp, boolean, jsonb, integer } from "drizzle-orm/pg-core";
import { users } from "./users";
import { templates } from "./templates";
import { relations } from "drizzle-orm";

/**
 * Tabela de sites criados pelo usuário
 */
export const sites = pgTable("sites", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  
  // Informações básicas
  name: text("name").notNull(),
  domain: text("domain"),
  
  // Status do site
  status: text("status", { 
    enum: ["draft", "building", "deployed", "error"] 
  }).notNull().default("draft"),
  
  // Template usado (opcional)
  template_id: uuid("template_id").references(() => templates.id),
  
  // Conteúdo do site (JSON com estrutura completa)
  content: jsonb("content").notNull().$type<{
    pages: Array<{
      path: string;
      title: string;
      content: string;
    }>;
    assets: Array<{
      path: string;
      url: string;
    }>;
    config: Record<string, unknown>;
  }>(),
  
  // Deploy
  deploy_url: text("deploy_url"),
  deploy_provider: text("deploy_provider"), // vercel, netlify, cloudflare
  deploy_id: text("deploy_id"),
  
  // Metadados
  is_public: boolean("is_public").default(false),
  is_indexable: boolean("is_indexable").default(true),
  
  // Timestamps
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  deployed_at: timestamp("deployed_at"),
  
  // Contadores
  visits: integer("visits").default(0),
});

// Relacionamentos
export const sitesRelations = relations(sites, ({ one }) => ({
  user: one(users, {
    fields: [sites.user_id],
    references: [users.id],
  }),
  template: one(templates, {
    fields: [sites.template_id],
    references: [templates.id],
  }),
}));

export type Site = typeof sites.$inferSelect;
export type NewSite = typeof sites.$inferInsert;
