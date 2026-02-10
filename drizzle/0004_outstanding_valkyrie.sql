CREATE TABLE `doc_embeddings` (
	`id` text PRIMARY KEY NOT NULL,
	`content` text NOT NULL,
	`content_hash` text NOT NULL,
	`vector` F32_BLOB(1024)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `doc_embeddings_contentHash_unique` ON `doc_embeddings` (`content_hash`);