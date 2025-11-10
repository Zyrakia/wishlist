import { relations, sql } from 'drizzle-orm';
import { integer, primaryKey, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
const autoTimestampColumn = integer({ mode: 'timestamp' })
	.notNull()
	.default(sql`(unixepoch())`);

export const UserTable = sqliteTable('user', {
	id: text().primaryKey(),
	name: text().notNull(),
	email: text().notNull().unique(),
	password: text().notNull(),
	createdAt: autoTimestampColumn,
});

export const _UserRelations = relations(UserTable, ({ many }) => ({
	wishlists: many(WishlistTable),
}));

export const WishlistTable = sqliteTable('wishlist', {
	id: text().primaryKey(),
	userId: text()
		.notNull()
		.references(() => UserTable.id, { onDelete: 'cascade' }),
	slug: text().notNull().unique(),
	name: text().notNull(),
	description: text().notNull(),
	createdAt: autoTimestampColumn,
	activityAt: autoTimestampColumn,
});

export const _WishlistRelations = relations(WishlistTable, ({ one, many }) => ({
	user: one(UserTable, {
		fields: [WishlistTable.userId],
		references: [UserTable.id],
	}),

	items: many(WishlistItemTable),
}));

export const WishlistItemTable = sqliteTable(
	'wishlist_item',
	{
		wishlistId: text()
			.notNull()
			.references(() => WishlistTable.id, { onDelete: 'cascade' }),
		id: text().notNull(),
		name: text().notNull(),
		notes: text().notNull(),
		priceCurrency: text(),
		price: real(),
		imageUrl: text(),
		url: text(),
		createdAt: autoTimestampColumn,
	},
	(t) => [primaryKey({ columns: [t.wishlistId, t.id] })],
);

export const _WishlistItemRelations = relations(WishlistItemTable, ({ one }) => ({
	wishlist: one(WishlistTable, {
		fields: [WishlistItemTable.wishlistId],
		references: [WishlistTable.id],
	}),
}));

export const CircleTable = sqliteTable('circles', {
	id: text().primaryKey(),
	name: text().notNull(),
	ownerId: text()
		.notNull()
		.unique()
		.references(() => UserTable.id, { onDelete: 'cascade' }),
	memberLimit: integer().notNull(),
	createdAt: autoTimestampColumn,
});

export const _CirclesRelations = relations(CircleTable, ({ one, many }) => ({
	members: many(CircleMembershipTable),
	owner: one(UserTable, {
		fields: [CircleTable.ownerId],
		references: [UserTable.id],
	}),
}));

export const CircleInviteTable = sqliteTable(
	'circle_invite',
	{
		circleId: text()
			.notNull()
			.references(() => CircleTable.id, { onDelete: 'cascade' }),
		userId: text()
			.notNull()
			.references(() => UserTable.id, { onDelete: 'cascade' }),
		createdAt: autoTimestampColumn,
	},
	(t) => [primaryKey({ columns: [t.circleId, t.userId] })],
);

export const _CircleInviteRelations = relations(CircleInviteTable, ({ one }) => ({
	circle: one(CircleTable, {
		fields: [CircleInviteTable.circleId],
		references: [CircleTable.id],
	}),
	user: one(UserTable, {
		fields: [CircleInviteTable.userId],
		references: [UserTable.id],
	}),
}));

export const CircleMembershipTable = sqliteTable(
	'circle_membership',
	{
		circleId: text()
			.notNull()
			.references(() => CircleTable.id, { onDelete: 'cascade' }),
		userId: text()
			.notNull()
			.references(() => UserTable.id, { onDelete: 'cascade' }),
		joinedAt: autoTimestampColumn,
	},
	(t) => [primaryKey({ columns: [t.circleId, t.userId] })],
);

export const _CircleMembershipRelations = relations(CircleMembershipTable, ({ one }) => ({
	circle: one(CircleTable, {
		fields: [CircleMembershipTable.circleId],
		references: [CircleTable.id],
	}),
	user: one(UserTable, {
		fields: [CircleMembershipTable.userId],
		references: [UserTable.id],
	}),
}));
