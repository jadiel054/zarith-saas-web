import { pgTable, text, uuid, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { users } from "./users";
import { relations } from "drizzle-orm";

/**
 * Tabela de conteúdo criado (artigos, posts, páginas)
 */
export const content = pgTable("content", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  
  // Informações básicas
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  excerpt: text("excerpt"),
  
  // Tipo de conteúdo
  type: text("type", { 
    enum: ["article", "post", "page", "documentation", "tutorial"] 
  }).notNull().default("article"),
  
  // Conteúdo principal (Markdown)
  markdown_content: text("markdown_content"),
  html_content: text("html_content"),
  
  // Metadados
  metadata: jsonb("metadata").$type<{
    author?: string;
    keywords?: string[];
    description?: string;
    og_image?: string;
    canonical_url?: string;
  }>(),
  
  // Status
  status: text("status", { 
    enum: ["draft", "published", "archived"] 
  }).notNull().default("draft"),
  
  // Visibilidade
  is_public: boolean("is_public").default(true),
  is_featured: boolean("is_featured").default(false),
  
  // Timestamps
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  published_at: timestamp("published_at"),
  
  // Contadores
  views: integer("views").default(0),
  likes: integer("likes").default(0),
  comments_count: integer("comments_count").default(0),
  
  // SEO
  seo_title: text("seo_title"),
  seo_description: text("seo_description"),
});

// Relacionamentos
export const contentRelations = relations(content, ({ one }) => ({
  user: one(users, {
    fields: [content.user_id],
    references: [users.id],
  }),
}));

export type Content = typeof content.$inferSelect;
export type NewContent = typeof content.$inferInsert;
