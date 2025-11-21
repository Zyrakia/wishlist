CREATE TABLE `wishlist_connection` (
	`wishlist_id` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`provider` text NOT NULL,
	`sync_error` integer,
	`last_synced_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`wishlist_id`) REFERENCES `wishlist`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `wishlist_item` ADD `connection_id` text REFERENCES wishlist_connection(id);