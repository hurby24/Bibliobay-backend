CREATE TABLE `subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`order_id` text,
	`product_id` text,
	`variant_id` text,
	`status` text,
	`renews_at` text,
	`ends_at` text,
	`card_brand` text,
	`card_last_four` text,
	`update_payment_method_url` text,
	`update_at` text DEFAULT NULL,
	`created_at` text DEFAULT '2024-08-17T18:09:30.182Z' NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
/*
 SQLite does not support "Set default to column" out of the box, we do not generate automatic migration for that, so it has to be done manually
 Please refer to: https://www.techonthenet.com/sqlite/tables/alter_table.php
                  https://www.sqlite.org/lang_altertable.html
                  https://stackoverflow.com/questions/2083543/modify-a-columns-type-in-sqlite3

 Due to that we don't generate migration automatically and it has to be done manually
*/