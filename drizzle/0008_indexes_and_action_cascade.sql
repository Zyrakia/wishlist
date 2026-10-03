PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_account_action` (
	`token` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`type` text NOT NULL,
	`payload` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_account_action`("token", "user_id", "expires_at", "type", "payload") SELECT "token", "user_id", "expires_at", "type", "payload" FROM `account_action`;--> statement-breakpoint
DROP TABLE `account_action`;--> statement-breakpoint
ALTER TABLE `__new_account_action` RENAME TO `account_action`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `account_action_user_idx` ON `account_action` (`user_id`);--> statement-breakpoint
CREATE INDEX `group_invite_target_email_idx` ON `group_invite` (`target_email`);--> statement-breakpoint
CREATE INDEX `group_membership_user_idx` ON `group_membership` (`user_id`);--> statement-breakpoint
CREATE INDEX `item_reservation_wishlist_idx` ON `item_reservation` (`wishlist_id`);--> statement-breakpoint
CREATE INDEX `item_reservation_user_idx` ON `item_reservation` (`user_id`);--> statement-breakpoint
CREATE INDEX `wishlist_connection_wishlist_idx` ON `wishlist_connection` (`wishlist_id`);--> statement-breakpoint
CREATE INDEX `wishlist_item_wishlist_order_idx` ON `wishlist_item` (`wishlist_id`,`order`);--> statement-breakpoint
CREATE INDEX `wishlist_item_connection_idx` ON `wishlist_item` (`connection_id`);--> statement-breakpoint
CREATE INDEX `wishlist_user_activity_idx` ON `wishlist` (`user_id`,`activity_at`);