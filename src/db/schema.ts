import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    username: text("username").unique().notNull(),
    email: text("email").unique().notNull(),
    bio: text("bio"),
    avatar: text("avatar").notNull(),
    banner: text("banner"),
    supporter: integer("supporter", { mode: "boolean" })
      .notNull()
      .default(false),
    email_confirmed_at: text("email_confirmed_at").default(sql`NULL`),
    is_banned: integer("is_banned", { mode: "boolean" })
      .notNull()
      .default(false),
    private: integer("private", { mode: "boolean" }).notNull().default(false),
    last_sign_in_at: text("last_sign_in_at")
      .notNull()
      .default(new Date().toISOString()),
    updated_at: text("update_at").default(sql`NULL`),
    created_at: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => {
    return {
      emailIdx: uniqueIndex("email_idx").on(table.email),
      usernameIdx: uniqueIndex("username_idx").on(table.username),
    };
  }
);

export const books = sqliteTable(
  "books",
  {
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
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => {
    return {
      userIdIdx: index("book_user_id_idx").on(table.user_id),
      createdAtIdx: uniqueIndex("created_at_idx").on(table.created_at),
    };
  }
);

export const shelves = sqliteTable(
  "shelves",
  {
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
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => {
    return {
      userIdIdx: index("shelves_user_id_idx").on(table.user_id),
    };
  }
);

export const book_shelves = sqliteTable(
  "book_shelves",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    book_id: text("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    shelf_id: text("shelf_id")
      .notNull()
      .references(() => shelves.id, { onDelete: "cascade" }),
  },
  (table) => {
    return {
      bookShelfIdx: index("book_shelf_idx").on(table.book_id, table.shelf_id),
    };
  }
);

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

export const oauth_accounts = sqliteTable(
  "oauth_accounts",
  {
    provider_user_id: text("provider_user_id").primaryKey(),
    provider_id: text("provider_id").notNull(),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),
  },
  (table) => {
    return {
      userIdIdx: index("oauth_user_id_idx").on(table.user_id),
      providerIdIdx: index("provider_id_idx").on(table.provider_id),
    };
  }
);

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
    .default(sql`CURRENT_TIMESTAMP`),
});

export const friends = sqliteTable("friends", {
  id: text("id").primaryKey(),
  user_id: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  friend_id: text("friend_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  created_at: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const friend_requests = sqliteTable("friend_requests", {
  id: text("id").primaryKey(),
  sender_id: text("sender_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  receiver_id: text("receiver_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  created_at: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const subscriptions = sqliteTable("subscriptions", {
  id: text("id").primaryKey(),
  user_id: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  order_id: text("order_id"),
  product_id: text("product_id"),
  variant_id: text("variant_id"),
  status: text("status"),
  renews_at: text("renews_at"),
  ends_at: text("ends_at"),
  card_brand: text("card_brand"),
  card_last_four: text("card_last_four"),
  updated_at: text("update_at").default(sql`NULL`),
  created_at: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
