import { pgTable, text, uuid, timestamp, boolean } from "drizzle-orm/pg-core";
import { users } from "./users";
import { relations } from "drizzle-orm";

/**
 * Tabela de tokens para recuperação de senha
 * Armazena tokens de uso único para reset de senha
 */
export const password_reset_tokens = pgTable("password_reset_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expires_at: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Relacionamentos
export const passwordResetTokensRelations = relations(password_reset_tokens, ({ one }) => ({
  user: one(users, {
    fields: [password_reset_tokens.user_id],
    references: [users.id],
  }),
}));

export type PasswordResetToken = typeof password_reset_tokens.$inferSelect;
export type NewPasswordResetToken = typeof password_reset_tokens.$inferInsert;
