-- Users search (group mutuals), one row per group membership for fast mutuals filtering later

CREATE VIRTUAL TABLE mutuals_fts USING fts5(
    name,
    user_id UNINDEXED,
    group_id UNINDEXED
);
--> statement-breakpoint

CREATE TRIGGER mutuals_fts_insert AFTER INSERT ON group_membership BEGIN
    INSERT INTO mutuals_fts(name, user_id, group_id)
    SELECT user.name, new.user_id, new.group_id
    FROM user
    WHERE user.id = new.user_id;
END;
--> statement-breakpoint

CREATE TRIGGER mutuals_fts_delete AFTER DELETE ON group_membership BEGIN
    DELETE FROM mutuals_fts
    WHERE mutuals_fts.group_id = old.group_id AND mutuals_fts.user_id = old.user_id;
END;
--> statement-breakpoint

CREATE TRIGGER mutuals_fts_user_update AFTER UPDATE OF name ON user BEGIN
    UPDATE mutuals_fts
    SET name = new.name
    WHERE mutuals_fts.user_id = new.id;
END;
--> statement-breakpoint

-- Reserved items search, filtered by reservation owner later

CREATE VIRTUAL TABLE reservations_fts USING fts5(
    name, notes,
    item_id UNINDEXED,
    user_id UNINDEXED
);
--> statement-breakpoint

CREATE TRIGGER reservations_fts_insert AFTER INSERT ON item_reservation BEGIN
    INSERT INTO reservations_fts(name, notes, item_id, user_id)
    SELECT item.name, item.notes, new.item_id, new.user_id
    FROM wishlist_item as item
    WHERE item.id = new.item_id;
END;
--> statement-breakpoint

CREATE TRIGGER reservations_fts_delete AFTER DELETE ON item_reservation BEGIN
    DELETE FROM reservations_fts
    WHERE reservations_fts.item_id = old.item_id;
END;
--> statement-breakpoint

CREATE TRIGGER reservations_fts_item_update AFTER UPDATE OF name, notes ON wishlist_item BEGIN
    UPDATE reservations_fts
    SET name = new.name, notes = new.notes
    WHERE reservations_fts.item_id = new.id;
END;
--> statement-breakpoint

-- Lists search, filtered by list owner later

CREATE VIRTUAL TABLE lists_fts USING fts5(
    name, description,
    content = 'wishlist'
);
--> statement-breakpoint

-- We can use fts5 delete / insert pattern since it's backed by the wishlist table

CREATE TRIGGER lists_fts_insert AFTER INSERT ON wishlist BEGIN
    INSERT INTO lists_fts(rowid, name, description)
    VALUES (new.rowid, new.name, new.description);
END;
--> statement-breakpoint

CREATE TRIGGER lists_fts_delete AFTER DELETE ON wishlist BEGIN
    INSERT INTO lists_fts(lists_fts, rowid, name, description)
    VALUES ('delete', old.rowid, old.name, old.description);
END;
--> statement-breakpoint

CREATE TRIGGER lists_fts_update AFTER UPDATE OF name, description ON wishlist BEGIN
    INSERT INTO lists_fts(lists_fts, rowid, name, description)
    VALUES ('delete', old.rowid, old.name, old.description);

    INSERT INTO lists_fts(rowid, name, description)
    VALUES (new.rowid, new.name, new.description);
END;
--> statement-breakpoint

-- Backfill for existing data

INSERT INTO mutuals_fts(name, user_id, group_id)
SELECT user.name, group_membership.user_id, group_membership.group_id
FROM group_membership
INNER JOIN user ON user.id = group_membership.user_id;
--> statement-breakpoint

INSERT INTO reservations_fts(name, notes, item_id, user_id)
SELECT wishlist_item.name, wishlist_item.notes, item_reservation.item_id, item_reservation.user_id
FROM item_reservation
INNER JOIN wishlist_item ON wishlist_item.id = item_reservation.item_id;
--> statement-breakpoint

-- We can shortcut since it's content backed
INSERT INTO lists_fts(lists_fts) VALUES ('rebuild');
