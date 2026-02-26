-- Mutuals search (FTS5 contentless)
CREATE VIRTUAL TABLE group_membership_fts USING fts5(
	name,
	group_id UNINDEXED,
	user_id UNINDEXED
	-- need to update sqlite version here so it's supported
	-- content='',
	-- contentless_delete=1,
	-- contentless_unindexed=1
);
--> statement-breakpoint
CREATE TRIGGER group_membership_fts_insert AFTER INSERT ON group_membership BEGIN
	INSERT INTO group_membership_fts(rowid, name, group_id, user_id)
	SELECT new.rowid, user.name, new.group_id, new.user_id
	FROM user
	WHERE user.id = new.user_id;
END;
--> statement-breakpoint
CREATE TRIGGER group_membership_fts_delete AFTER DELETE ON group_membership BEGIN
	DELETE FROM group_membership_fts
	WHERE rowid = old.rowid;
END;
--> statement-breakpoint
CREATE TRIGGER group_membership_fts_name_update AFTER UPDATE OF name ON user BEGIN
	UPDATE group_membership_fts
	SET name = new.name
	WHERE user_id = new.id;
END;
--> statement-breakpoint
INSERT INTO group_membership_fts(rowid, name, group_id, user_id)
SELECT group_membership.rowid, user.name, group_id, user_id
FROM group_membership
INNER JOIN user ON user.id = group_membership.user_id;
--> statement-breakpoint

-- Reserved items search (FTS5 contentless)
CREATE VIRTUAL TABLE reservation_fts USING fts5(
	name, notes, owner_name,
	item_id UNINDEXED,
	wishlist_id UNINDEXED,
	reserver_id UNINDEXED,
	owner_id UNINDEXED
);
--> statement-breakpoint
CREATE TRIGGER reservation_fts_insert AFTER INSERT ON item_reservation BEGIN
	INSERT INTO reservation_fts(rowid, name, notes, owner_name, item_id, wishlist_id, reserver_id, owner_id)
	SELECT new.rowid, item.name, item.notes, owner.name, new.item_id, new.wishlist_id, new.user_id, wishlist.user_id
	FROM wishlist_item as item
	INNER JOIN wishlist ON wishlist.id = new.wishlist_id
	INNER JOIN user as owner ON owner.id = wishlist.user_id
	WHERE item.id = new.item_id;
END;
--> statement-breakpoint
CREATE TRIGGER reservation_fts_delete AFTER DELETE ON item_reservation BEGIN
	DELETE FROM reservation_fts
	WHERE rowid = old.rowid;
END;
--> statement-breakpoint
CREATE TRIGGER reservation_fts_item_update AFTER UPDATE OF name, notes ON wishlist_item BEGIN
	UPDATE reservation_fts
	SET name = new.name, notes = new.notes
	WHERE item_id = new.id;
END;
--> statement-breakpoint
CREATE TRIGGER reservation_fts_user_update AFTER UPDATE OF name ON user BEGIN
	UPDATE reservation_fts
	SET owner_name = new.name
	WHERE owner_id = new.id;
END;
--> statement-breakpoint
INSERT INTO reservation_fts(rowid, name, notes, owner_name, item_id, wishlist_id, reserver_id, owner_id)
SELECT 
	res.rowid,
    item.name, 
    item.notes, 
	owner.name,
    res.item_id, 
    res.wishlist_id, 
    res.user_id, 
    wishlist.user_id
FROM item_reservation AS res
INNER JOIN wishlist_item AS item ON item.id = res.item_id
INNER JOIN wishlist ON wishlist.id = res.wishlist_id
INNER JOIN user AS owner ON owner.id = wishlist.user_id;
--> statement-breakpoint

-- List search (FTS5 external content: wishlist)
CREATE VIRTUAL TABLE list_fts USING fts5(
	name, description,
	content='wishlist',
	content_rowid='rowid'
);
--> statement-breakpoint
CREATE TRIGGER list_fts_insert AFTER INSERT ON wishlist BEGIN
	INSERT INTO list_fts(rowid, name, description)
	VALUES (new.rowid, new.name, new.description);
END;
--> statement-breakpoint
CREATE TRIGGER list_fts_delete AFTER DELETE ON wishlist BEGIN
	INSERT INTO list_fts(list_fts, rowid, name, description)
	VALUES ('delete', old.rowid, old.name, old.description);
END;
--> statement-breakpoint
CREATE TRIGGER list_fts_update AFTER UPDATE OF name, description ON wishlist BEGIN
	INSERT INTO list_fts(list_fts, rowid, name, description)
	VALUES ('delete', old.rowid, old.name, old.description);

	INSERT INTO list_fts(rowid, name, description)
	VALUES (new.rowid, new.name, new.description);
END;
--> statement-breakpoint
INSERT INTO list_fts(list_fts) VALUES ('rebuild');
--> statement-breakpoint

-- Group search (FTS5 external content: group)
CREATE VIRTUAL TABLE group_fts USING fts5(
	name,
	content='group',
	content_rowid='rowid'
);
--> statement-breakpoint
CREATE TRIGGER group_fts_insert AFTER INSERT ON "group" BEGIN
	INSERT INTO group_fts(rowid, name)
	VALUES (new.rowid, new.name);
END;
--> statement-breakpoint
CREATE TRIGGER group_fts_delete AFTER DELETE ON "group" BEGIN
	INSERT INTO group_fts(group_fts, rowid, name)
	VALUES ('delete',  old.rowid, old.name);
END;
--> statement-breakpoint
CREATE TRIGGER group_fts_update AFTER UPDATE OF name ON "group" BEGIN
	INSERT INTO group_fts(group_fts, rowid, name)
	VALUES ('delete',  old.rowid, old.name);
	
	INSERT INTO group_fts(rowid, name)
	VALUES (new.rowid, new.name);
END;
--> statement-breakpoint
INSERT INTO group_fts(group_fts) VALUES ('rebuild');
