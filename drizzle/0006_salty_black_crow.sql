CREATE TABLE `__new_item_reservation` (
	`item_id` text PRIMARY KEY NOT NULL,
	`wishlist_id` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `wishlist_item`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`wishlist_id`) REFERENCES `wishlist`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_item_reservation`("item_id", "wishlist_id", "user_id", "created_at") SELECT "item_id", "wishlist_id", "user_id", "created_at" FROM `item_reservation`;--> statement-breakpoint
DROP TABLE `item_reservation`;--> statement-breakpoint
ALTER TABLE `__new_item_reservation` RENAME TO `item_reservation`;
