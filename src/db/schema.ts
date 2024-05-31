import {
  pgTable,
  varchar,
  text,
  boolean,
  uuid,
  timestamp,
  serial,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
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

export const email_verifaction_codes = pgTable("email_verifaction_codes", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 6 }).notNull(),
  user_id: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id),
  email: varchar("email", { length: 200 }).notNull().unique(),
  expires_at: timestamp("expires_at").notNull(),
});
