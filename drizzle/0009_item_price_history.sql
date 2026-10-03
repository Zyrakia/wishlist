CREATE TABLE `item_price` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_id` text NOT NULL,
	`price` real NOT NULL,
	`currency` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `wishlist_item`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `item_price_item_created_idx` ON `item_price` (`item_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `wishlist_item` ADD `price_id` integer REFERENCES item_price(id) ON DELETE set null;--> statement-breakpoint
ALTER TABLE `wishlist_item` ADD `price_checked_at` integer;--> statement-breakpoint
CREATE INDEX `wishlist_item_price_checked_idx` ON `wishlist_item` (`price_checked_at`);--> statement-breakpoint
INSERT INTO `item_price` (`item_id`, `price`, `currency`)
SELECT `id`, `price`, coalesce(`price_currency`, 'USD') FROM `wishlist_item` WHERE `price` IS NOT NULL;--> statement-breakpoint
UPDATE `wishlist_item` SET `price_id` = (
	SELECT `item_price`.`id` FROM `item_price` WHERE `item_price`.`item_id` = `wishlist_item`.`id`
) WHERE `price` IS NOT NULL;--> statement-breakpoint
ALTER TABLE `wishlist_item` DROP COLUMN `price`;--> statement-breakpoint
ALTER TABLE `wishlist_item` DROP COLUMN `price_currency`;
