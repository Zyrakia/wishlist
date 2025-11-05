PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_user`("id", "name", "email", "password", "created_at") SELECT "id", "name", "email", "password", "created_at" FROM `user`;--> statement-breakpoint
DROP TABLE `user`;--> statement-breakpoint
ALTER TABLE `__new_user` RENAME TO `user`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `__new_wishlist_item` (
	`wishlist_id` text NOT NULL,
	`id` text NOT NULL,
	`name` text NOT NULL,
	`notes` text NOT NULL,
	`price_currency` text,
	`price` real,
	`image_url` text,
	`url` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`wishlist_id`, `id`),
	FOREIGN KEY (`wishlist_id`) REFERENCES `wishlist`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_wishlist_item`("wishlist_id", "id", "name", "notes", "price_currency", "price", "image_url", "url", "created_at") SELECT "wishlist_id", "id", "name", "notes", "price_currency", "price", "image_url", "url", "created_at" FROM `wishlist_item`;--> statement-breakpoint
DROP TABLE `wishlist_item`;--> statement-breakpoint
ALTER TABLE `__new_wishlist_item` RENAME TO `wishlist_item`;--> statement-breakpoint
CREATE TABLE `__new_wishlist` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_wishlist`("id", "user_id", "slug", "name", "description", "created_at", "updated_at") SELECT "id", "user_id", "slug", "name", "description", "created_at", "updated_at" FROM `wishlist`;--> statement-breakpoint
DROP TABLE `wishlist`;--> statement-breakpoint
ALTER TABLE `__new_wishlist` RENAME TO `wishlist`;--> statement-breakpoint
CREATE UNIQUE INDEX `wishlist_slug_unique` ON `wishlist` (`slug`);