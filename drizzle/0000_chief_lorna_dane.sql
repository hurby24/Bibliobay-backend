CREATE TABLE IF NOT EXISTS "email_verification_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(6) NOT NULL,
	"user_id" char(21) NOT NULL,
	"email" varchar(200) NOT NULL,
	"expires_at" timestamp NOT NULL,
	CONSTRAINT "email_verification_codes_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "email_verification_codes_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" char(21) PRIMARY KEY NOT NULL,
	"username" varchar(25) NOT NULL,
	"email" varchar(200) NOT NULL,
	"bio" varchar(255),
	"avatar" text NOT NULL,
	"email_confirmed_at" timestamp,
	"is_banned" boolean DEFAULT false NOT NULL,
	"private" boolean DEFAULT false NOT NULL,
	"last_sign_in_at" timestamp DEFAULT now() NOT NULL,
	"update_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "email_verification_codes" ADD CONSTRAINT "email_verification_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
