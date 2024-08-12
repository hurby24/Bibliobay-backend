DROP INDEX IF EXISTS `user_id_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `emailIdx`;--> statement-breakpoint
CREATE INDEX `book_user_id_idx` ON `books` (`user_id`);--> statement-breakpoint
CREATE INDEX `oauth_user_id_idx` ON `oauth_accounts` (`user_id`);--> statement-breakpoint
CREATE INDEX `shelves_user_id_idx` ON `shelves` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `email_idx` ON `users` (`email`);