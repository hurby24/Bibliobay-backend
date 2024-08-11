CREATE TABLE `friend_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`sender_id` text NOT NULL,
	`receiver_id` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`receiver_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `friends` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`friend_id` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`friend_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
