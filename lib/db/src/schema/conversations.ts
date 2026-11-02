import { pgTable, text, uuid, timestamp, boolean } from "drizzle-orm/pg-core";
import { users } from "./users";
import { relations } from "drizzle-orm";

/**
 * Tabela de conversas (sessões de chat)
 */
export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("Nova conversa"),
  
  // Metadados da conversa
  model: text("model").default("zarith-default"),
  temperature: text("temperature").default("0.7"),
  
  // Controle de visibilidade e compartilhamento
  is_public: boolean("is_public").default(false),
  share_token: text("share_token"),
  
  // Timestamps
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  
  // Contadores para otimização
  messages_count: integer("messages_count").default(0),
  tokens_used: bigint("tokens_used", { mode: "number" }).default(0),
});

// Relacionamentos
export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, {
    fields: [conversations.user_id],
    references: [users.id],
  }),
  messages: many(messages),
}));

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;

// Helper para importar messages (evitar circular dependency)
import { pgTable as pgTableInner, uuid as uuidInner, text as textInner, timestamp as timestampInner } from "drizzle-orm/pg-core";
import { users as usersInner } from "./users";

const messages = pgTableInner("messages", {
  id: uuidInner("id").primaryKey().defaultRandom(),
  conversation_id: uuidInner("conversation_id").notNull(),
  role: textInner("role", { enum: ["user", "assistant", "system"] }).notNull(),
  content: textInner("content").notNull(),
  model: textInner("model"),
  created_at: timestampInner("created_at").defaultNow().notNull(),
});

export { messages };
