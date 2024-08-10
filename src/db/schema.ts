import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  username: text("username").unique().notNull(),
  email: text("email").unique().notNull(),
  bio: text("bio"),
  avatar: text("avatar").notNull(),
  banner: text("banner"),
  email_confirmed_at: text("email_confirmed_at").default(sql`NULL`),
  is_banned: integer("is_banned", { mode: "boolean" }).notNull().default(false),
  private: integer("private", { mode: "boolean" }).notNull().default(false),
  last_sign_in_at: text("last_sign_in_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updated_at: text("update_at").default(sql`NULL`),
  created_at: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

export const books = sqliteTable("books", {
  id: text("id").primaryKey(),
  user_id: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  author: text("author").notNull(),
  cover_url: text("cover_url").notNull(),
  rating: text("rating"),
  pages: integer("pages").notNull(),
  current_page: integer("current_page").default(0),
  favorite: integer("favorite", { mode: "boolean" }).notNull().default(false),
  finished: integer("finished", { mode: "boolean" }).notNull().default(false),
  private: integer("private", { mode: "boolean" }).notNull().default(false),
  finished_at: text("finished_at").default(sql`NULL`),
  updated_at: text("update_at").default(sql`NULL`),
  created_at: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

export const shelves = sqliteTable("shelves", {
  id: text("id").primaryKey(),
  user_id: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  private: integer("private", { mode: "boolean" }).notNull().default(false),
  updated_at: text("update_at").default(sql`NULL`),
  created_at: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

export const book_shelves = sqliteTable("book_shelves", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  book_id: text("book_id")
    .notNull()
    .references(() => books.id, { onDelete: "cascade" }),
  shelf_id: text("shelf_id")
    .notNull()
    .references(() => shelves.id, { onDelete: "cascade" }),
});

export const genres = sqliteTable("genres", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
});

export const book_genres = sqliteTable("book_genres", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  book_id: text("book_id")
    .notNull()
    .references(() => books.id, { onDelete: "cascade" }),
  genre_id: integer("genre_id")
    .notNull()
    .references(() => genres.id, { onDelete: "cascade" }),
});

export const email_verification_codes = sqliteTable(
  "email_verification_codes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    code: text("code").notNull(),
    user_id: text("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    email: text("email").notNull().unique(),
    attempts: integer("attempts").notNull().default(3),
    expires_at: text("expires_at").notNull(),
  }
);

export const oauth_accounts = sqliteTable("oauth_accounts", {
  provider_user_id: text("provider_user_id").primaryKey(),
  provider_id: text("provider_id").notNull(),
  user_id: text("user_id")
    .notNull()
    .references(() => users.id, {
      onDelete: "cascade",
    }),
});

export const goals = sqliteTable("goals", {
  id: text("id").primaryKey(),
  user_id: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  goal_type: text("type").notNull(),
  target: integer("target").notNull(),
  time: text("time").notNull(),
  updated_at: text("update_at").default(sql`NULL`),
  created_at: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});
