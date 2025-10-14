CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `wishlist_item` (
	`wishlist_id` text NOT NULL,
	`id` text NOT NULL,
	`name` text NOT NULL,
	`notes` text NOT NULL,
	`price_currency` text,
	`price` real,
	`image_url` text,
	`url` text,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`wishlist_id`, `id`),
	FOREIGN KEY (`wishlist_id`) REFERENCES `wishlist`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `wishlist` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
