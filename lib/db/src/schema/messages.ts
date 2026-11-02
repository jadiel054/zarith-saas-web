import { pgTable, text, uuid, timestamp, integer } from "drizzle-orm/pg-core";
import { conversations } from "./conversations";
import { relations } from "drizzle-orm";

/**
 * Tabela de mensagens do chat
 */
export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversation_id: uuid("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant", "system"] }).notNull(),
  content: text("content").notNull(),
  model: text("model"),
  
  // Metadados da mensagem
  token_count: integer("token_count"),
  
  // Para tool calls
  tool_call_id: text("tool_call_id"),
  tool_name: text("tool_name"),
  tool_arguments: text("tool_arguments"),
  tool_result: text("tool_result"),
  
  // Timestamps
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Relacionamentos
export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversation_id],
    references: [conversations.id],
  }),
}));

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
