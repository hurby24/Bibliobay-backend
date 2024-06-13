CREATE TABLE IF NOT EXISTS "book_genres" (
	"id" serial PRIMARY KEY NOT NULL,
	"book_id" char(21) NOT NULL,
	"genre_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "book_shelves" (
	"id" serial PRIMARY KEY NOT NULL,
	"book_id" char(21) NOT NULL,
	"shelf_id" char(21) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "books" (
	"id" char(21) PRIMARY KEY NOT NULL,
	"user_id" char(21) NOT NULL,
	"slug" text NOT NULL,
	"title" varchar(150) NOT NULL,
	"author" varchar(150) NOT NULL,
	"cover_url" text NOT NULL,
	"rating" numeric(3, 1),
	"pages" integer NOT NULL,
	"current_page" integer DEFAULT 0,
	"favortie" boolean DEFAULT false NOT NULL,
	"finished" boolean DEFAULT false NOT NULL,
	"private" boolean DEFAULT false NOT NULL,
	"update_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "books_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "genres" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	CONSTRAINT "genres_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "shelves" (
	"id" char(21) PRIMARY KEY NOT NULL,
	"user_id" char(21) NOT NULL,
	"slug" text NOT NULL,
	"name" varchar(50) NOT NULL,
	"description" varchar(255),
	"private" boolean DEFAULT false NOT NULL,
	"update_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shelves_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "book_genres" ADD CONSTRAINT "book_genres_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "book_genres" ADD CONSTRAINT "book_genres_genre_id_genres_id_fk" FOREIGN KEY ("genre_id") REFERENCES "public"."genres"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "book_shelves" ADD CONSTRAINT "book_shelves_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "book_shelves" ADD CONSTRAINT "book_shelves_shelf_id_shelves_id_fk" FOREIGN KEY ("shelf_id") REFERENCES "public"."shelves"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "books" ADD CONSTRAINT "books_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shelves" ADD CONSTRAINT "shelves_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
