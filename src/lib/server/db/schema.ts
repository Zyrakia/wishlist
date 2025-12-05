import { relations, sql } from 'drizzle-orm';
import { integer, primaryKey, real, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core';

const autoTimestampColumn = () =>
	integer({ mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`);

export const UserTable = sqliteTable('user', {
	id: text().primaryKey(),
	name: text().notNull(),
	email: text().notNull().unique(),
	password: text().notNull(),
	createdAt: autoTimestampColumn(),
});

export const GeolocationTable = sqliteTable('geolocation', {
	id: text().primaryKey(),
	latitude: real().notNull(),
	longitude: real().notNull(),
	timemzone: text(),
});

export const WishlistTable = sqliteTable('wishlist', {
	id: text().primaryKey(),
	userId: text()
		.notNull()
		.references(() => UserTable.id, { onDelete: 'cascade' }),
	slug: text().notNull().unique(),
	name: text().notNull(),
	description: text().notNull(),
	createdAt: autoTimestampColumn(),
	activityAt: autoTimestampColumn(),
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
	createdGeoId: text().references(() => GeolocationTable.id, { onDelete: 'set null' }),
	createdAt: autoTimestampColumn(),
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
		favorited: integer({ mode: 'boolean' }).notNull().default(false),
		order: real().default(0).notNull(),
		createdAt: autoTimestampColumn(),
	},
	(t) => [primaryKey({ columns: [t.wishlistId, t.id] })],
);

export const GroupTable = sqliteTable('group', {
	id: text().primaryKey(),
	name: text().notNull(),
	ownerId: text()
		.notNull()
		.unique()
		.references(() => UserTable.id, { onDelete: 'cascade' }),
	memberLimit: integer().notNull(),
	createdAt: autoTimestampColumn(),
});

export const GroupInviteTable = sqliteTable(
	'group_invite',
	{
		id: text().primaryKey(),
		groupId: text()
			.notNull()
			.references(() => GroupTable.id, { onDelete: 'cascade' }),
		targetEmail: text().notNull(),
		createdAt: autoTimestampColumn(),
	},
	(t) => [unique('group_invitee_unique').on(t.groupId, t.targetEmail)],
);

export const GroupMembershipTable = sqliteTable(
	'group_membership',
	{
		groupId: text()
			.notNull()
			.references(() => GroupTable.id, { onDelete: 'cascade' }),
		userId: text()
			.notNull()
			.references(() => UserTable.id, { onDelete: 'cascade' }),
		joinedAt: autoTimestampColumn(),
	},
	(t) => [primaryKey({ columns: [t.groupId, t.userId] })],
);

export const AccountActionTable = sqliteTable('account_action', {
	token: text().primaryKey(),
	userId: text()
		.notNull()
		.references(() => UserTable.id),
	expiresAt: integer({ mode: 'timestamp' }).notNull(),
	type: text().notNull(),
	payload: text({ mode: 'json' }).notNull(),
});

export const _UserRelations = relations(UserTable, ({ many, one }) => ({
	wishlists: many(WishlistTable),
	groupMemberships: many(GroupMembershipTable),
	pendingActions: many(AccountActionTable),
	createdGroup: one(GroupTable, {
		fields: [UserTable.id],
		references: [GroupTable.ownerId],
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
	createdGeolocation: one(GeolocationTable, {
		fields: [WishlistConnectionTable.createdGeoId],
		references: [GeolocationTable.id],
	}),
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

export const _GroupsRelations = relations(GroupTable, ({ one, many }) => ({
	members: many(GroupMembershipTable),
	owner: one(UserTable, {
		fields: [GroupTable.ownerId],
		references: [UserTable.id],
	}),
	pendingInvites: many(GroupInviteTable),
}));

export const _GroupInviteRelations = relations(GroupInviteTable, ({ one }) => ({
	group: one(GroupTable, {
		fields: [GroupInviteTable.groupId],
		references: [GroupTable.id],
	}),
}));

export const _GroupMembershipRelations = relations(GroupMembershipTable, ({ one }) => ({
	group: one(GroupTable, {
		fields: [GroupMembershipTable.groupId],
		references: [GroupTable.id],
	}),
	user: one(UserTable, {
		fields: [GroupMembershipTable.userId],
		references: [UserTable.id],
	}),
}));

export const _AccountActionRelations = relations(AccountActionTable, ({ one }) => ({
	user: one(UserTable, {
		fields: [AccountActionTable.userId],
		references: [UserTable.id],
	}),
}));
