import { relations, sql } from 'drizzle-orm';
import { integer, primaryKey, real, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core';

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

export const WishlistConnectionTable = sqliteTable('wishlist_connection', {
	wishlistId: text()
		.notNull()
		.references(() => WishlistTable.id, { onDelete: 'cascade' }),
	id: text().primaryKey(),
	name: text().notNull(),
	url: text().notNull(),
	provider: text().notNull(),
	syncError: integer({ mode: 'boolean' }),
	lastSyncedAt: integer({ mode: 'timestamp' }),
	createdAt: autoTimestampColumn,
});

export const WishlistItemTable = sqliteTable(
	'wishlist_item',
	{
		wishlistId: text()
			.notNull()
			.references(() => WishlistTable.id, { onDelete: 'cascade' }),
		id: text().notNull(),
		connectionId: text().references(() => WishlistConnectionTable.id, { onDelete: 'set null' }),
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

export const CircleInviteTable = sqliteTable(
	'circle_invite',
	{
		id: text().primaryKey(),
		circleId: text()
			.notNull()
			.references(() => CircleTable.id, { onDelete: 'cascade' }),
		targetEmail: text().notNull(),
		createdAt: autoTimestampColumn,
	},
	(t) => [unique('circle_invitee_unique').on(t.circleId, t.targetEmail)],
);

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

export const AccountActionTable = sqliteTable('account_action', {
	token: text().primaryKey(),
	userId: text()
		.notNull()
		.references(() => UserTable.id),
	expiresAt: integer({ mode: 'timestamp' }).notNull(),
});

export const _UserRelations = relations(UserTable, ({ many, one }) => ({
	wishlists: many(WishlistTable),
	circleMemberships: many(CircleMembershipTable),
	pendingActions: many(AccountActionTable),
	createdCircle: one(CircleTable, {
		fields: [UserTable.id],
		references: [CircleTable.ownerId],
	}),
}));

export const _WishlistRelations = relations(WishlistTable, ({ one, many }) => ({
	user: one(UserTable, {
		fields: [WishlistTable.userId],
		references: [UserTable.id],
	}),

	items: many(WishlistItemTable),
	connections: many(WishlistConnectionTable),
}));

export const _WishlistConnectionRelations = relations(WishlistConnectionTable, ({ one, many }) => ({
	wishlist: one(WishlistTable, {
		fields: [WishlistConnectionTable.wishlistId],
		references: [WishlistTable.id],
	}),
	items: many(WishlistItemTable),
}));

export const _WishlistItemRelations = relations(WishlistItemTable, ({ one }) => ({
	wishlist: one(WishlistTable, {
		fields: [WishlistItemTable.wishlistId],
		references: [WishlistTable.id],
	}),
	source: one(WishlistConnectionTable, {
		fields: [WishlistItemTable.connectionId],
		references: [WishlistConnectionTable.id],
	}),
}));

export const _CirclesRelations = relations(CircleTable, ({ one, many }) => ({
	members: many(CircleMembershipTable),
	owner: one(UserTable, {
		fields: [CircleTable.ownerId],
		references: [UserTable.id],
	}),
	pendingInvites: many(CircleInviteTable),
}));

export const _CircleInviteRelations = relations(CircleInviteTable, ({ one }) => ({
	circle: one(CircleTable, {
		fields: [CircleInviteTable.circleId],
		references: [CircleTable.id],
	}),
}));

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

export const _AccountActionRelations = relations(AccountActionTable, ({ one }) => ({
	user: one(UserTable, {
		fields: [AccountActionTable.userId],
		references: [UserTable.id],
	}),
}));
