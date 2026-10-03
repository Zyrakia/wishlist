# Migrations

Use `bun run db:generate` + `bun run db:migrate`. Avoid `db:push`: drizzle-kit cannot introspect
the libSQL vector index on `doc_embeddings` and will always try to rebuild that table.

## Full-text search (FTS5) layer

`0007_fts_initial.sql` is hand-written and invisible to drizzle-kit. Its triggers live on
`user`, `wishlist`, `wishlist_item`, `group`, `group_membership` and `item_reservation`, and
`list_fts` / `group_fts` are keyed by the implicit `rowid` of `wishlist` / `group`.

When a generated migration **rebuilds** one of those tables (`CREATE TABLE __new_…` → `DROP` →
`RENAME`, which drizzle does for most column/constraint changes in SQLite):

- rebuilding `user`, `wishlist` or `wishlist_item` fails with
  `error in trigger reservation_fts_insert: no such table: main.wishlist`
- rebuilding the others succeeds but silently drops their FTS triggers, and rowids may shift

Fix by editing the generated migration:

1. Prepend `DROP TRIGGER IF EXISTS …` for all 13 FTS triggers and
   `DROP TABLE IF EXISTS …` for `group_membership_fts`, `reservation_fts`, `list_fts`, `group_fts`.
2. Leave the generated rebuild statements as they are.
3. Append the full contents of `0007_fts_initial.sql`, which recreates and repopulates everything.

Health check after migrating:

```sql
SELECT count(*) FROM sqlite_master WHERE type = 'trigger' AND name LIKE '%_fts_%'; -- 13
INSERT INTO list_fts(list_fts) VALUES ('integrity-check');
INSERT INTO group_fts(group_fts) VALUES ('integrity-check');
```
