CREATE TABLE `item_reservation` (
	`wishlist_id` text NOT NULL,
	`item_id` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`item_id`, `wishlist_id`),
	FOREIGN KEY (`wishlist_id`) REFERENCES `wishlist`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`item_id`) REFERENCES `wishlist_item`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_wishlist_item` (
	`id` text PRIMARY KEY NOT NULL,
	`wishlist_id` text NOT NULL,
	`connection_id` text,
	`name` text NOT NULL,
	`notes` text NOT NULL,
	`price_currency` text,
	`price` real,
	`image_url` text,
	`url` text,
	`favorited` integer DEFAULT false NOT NULL,
	`order` real DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`wishlist_id`) REFERENCES `wishlist`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`connection_id`) REFERENCES `wishlist_connection`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_wishlist_item`("id", "wishlist_id", "connection_id", "name", "notes", "price_currency", "price", "image_url", "url", "favorited", "order", "created_at") SELECT "id", "wishlist_id", "connection_id", "name", "notes", "price_currency", "price", "image_url", "url", "favorited", "order", "created_at" FROM `wishlist_item`;--> statement-breakpoint
DROP TABLE `wishlist_item`;--> statement-breakpoint
ALTER TABLE `__new_wishlist_item` RENAME TO `wishlist_item`;--> statement-breakpoint
PRAGMA foreign_keys=ON;