CREATE TABLE IF NOT EXISTS "email_verifaction_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(6) NOT NULL,
	"user_id" uuid NOT NULL,
	"email" varchar(200) NOT NULL,
	"expires_at" timestamp NOT NULL,
	CONSTRAINT "email_verifaction_codes_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "email_verifaction_codes_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"username" varchar(25) NOT NULL,
	"email" varchar(200) NOT NULL,
	"bio" varchar(255),
	"avatar" text NOT NULL,
	"email_confirmed_at" timestamp,
	"is_banned" boolean DEFAULT false NOT NULL,
	"private" boolean DEFAULT false NOT NULL,
	"last_sign_in_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"update_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "email_verifaction_codes" ADD CONSTRAINT "email_verifaction_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
