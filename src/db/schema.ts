// import {
//   pgTable,
//   varchar,
//   text,
//   boolean,
//   timestamp,
//   serial,
//   char,
//   numeric,
//   integer,
// } from "drizzle-orm/pg-core";

// export const users = pgTable("users", {
//   id: char("id", { length: 21 }).primaryKey(),
//   username: varchar("username", { length: 25 }).unique().notNull(),
//   email: varchar("email", { length: 200 }).unique().notNull(),
//   bio: varchar("bio", { length: 255 }),
//   avatar: text("avatar").notNull(),
//   banner: text("banner"),
//   email_confirmed_at: timestamp("email_confirmed_at"),
//   is_banned: boolean("is_banned").notNull().default(false),
//   private: boolean("private").notNull().default(false),
//   last_sign_in_at: timestamp("last_sign_in_at").notNull().defaultNow(),
//   updated_at: timestamp("update_at"),
//   created_at: timestamp("created_at").notNull().defaultNow(),
// });

// export const books = pgTable("books", {
//   id: char("id", { length: 15 }).primaryKey(),
//   user_id: char("user_id", { length: 21 })
//     .notNull()
//     .references(() => users.id, { onDelete: "cascade" }),
//   slug: text("slug").notNull().unique(),
//   title: varchar("title", { length: 150 }).notNull(),
//   author: varchar("author", { length: 150 }).notNull(),
//   cover_url: text("cover_url").notNull(),
//   rating: numeric("rating", { precision: 3, scale: 1 }),
//   pages: integer("pages").notNull(),
//   current_page: integer("current_page").default(0),
//   favorite: boolean("favortie").notNull().default(false),
//   finished: boolean("finished").notNull().default(false),
//   private: boolean("private").notNull().default(false),
//   updated_at: timestamp("update_at"),
//   created_at: timestamp("created_at").notNull().defaultNow(),
// });

// export const shelves = pgTable("shelves", {
//   id: char("id", { length: 15 }).primaryKey(),
//   user_id: char("user_id", { length: 21 })
//     .notNull()
//     .references(() => users.id, { onDelete: "cascade" }),
//   slug: text("slug").notNull().unique(),
//   name: varchar("name", { length: 50 }).notNull(),
//   description: varchar("description", { length: 255 }),
//   private: boolean("private").notNull().default(false),
//   updated_at: timestamp("update_at"),
//   created_at: timestamp("created_at").notNull().defaultNow(),
// });

// export const book_shelves = pgTable("book_shelves", {
//   id: serial("id").primaryKey(),
//   book_id: char("book_id", { length: 15 })
//     .notNull()
//     .references(() => books.id, { onDelete: "cascade" }),
//   shelf_id: char("shelf_id", { length: 15 })
//     .notNull()
//     .references(() => shelves.id, { onDelete: "cascade" }),
// });

// export const genres = pgTable("genres", {
//   id: serial("id").primaryKey(),
//   name: varchar("name", { length: 50 }).notNull().unique(),
// });

// export const book_genres = pgTable("book_genres", {
//   id: serial("id").primaryKey(),
//   book_id: char("book_id", { length: 15 })
//     .notNull()
//     .references(() => books.id, { onDelete: "cascade" }),
//   genre_id: integer("genre_id")
//     .notNull()
//     .references(() => genres.id, { onDelete: "cascade" }),
// });

// export const email_verification_codes = pgTable("email_verification_codes", {
//   id: serial("id").primaryKey(),
//   code: varchar("code", { length: 6 }).notNull(),
//   user_id: char("user_id", { length: 21 })
//     .notNull()
//     .unique()
//     .references(() => users.id, { onDelete: "cascade" }),
//   email: varchar("email", { length: 200 }).notNull().unique(),
//   expires_at: timestamp("expires_at").notNull(),
// });

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
    expires_at: text("expires_at").notNull(),
  }
);
