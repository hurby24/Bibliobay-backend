import {
  pgTable,
  varchar,
  text,
  boolean,
  timestamp,
  serial,
  char,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: char("id", { length: 21 }).primaryKey(), // Ensure this is char
  username: varchar("username", { length: 25 }).unique().notNull(),
  email: varchar("email", { length: 200 }).unique().notNull(),
  bio: varchar("bio", { length: 255 }),
  avatar: text("avatar").notNull(),
  email_confirmed_at: timestamp("email_confirmed_at"),
  is_banned: boolean("is_banned").notNull().default(false),
  private: boolean("private").notNull().default(false),
  last_sign_in_at: timestamp("last_sign_in_at").notNull().defaultNow(),
  update_at: timestamp("update_at"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const email_verification_codes = pgTable("email_verification_codes", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 6 }).notNull(),
  user_id: char("user_id", { length: 21 })
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 200 }).notNull().unique(),
  expires_at: timestamp("expires_at").notNull(),
});
