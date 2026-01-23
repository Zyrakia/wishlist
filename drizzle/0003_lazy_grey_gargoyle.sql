DROP TABLE `geolocation`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_wishlist_connection` (
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
INSERT INTO `__new_wishlist_connection`("wishlist_id", "id", "name", "url", "provider", "sync_error", "last_synced_at", "created_at") SELECT "wishlist_id", "id", "name", "url", "provider", "sync_error", "last_synced_at", "created_at" FROM `wishlist_connection`;--> statement-breakpoint
DROP TABLE `wishlist_connection`;--> statement-breakpoint
ALTER TABLE `__new_wishlist_connection` RENAME TO `wishlist_connection`;--> statement-breakpoint
PRAGMA foreign_keys=ON;