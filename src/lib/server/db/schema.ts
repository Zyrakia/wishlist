import { relations, sql } from 'drizzle-orm';
import {
	customType,
	index,
	integer,
	primaryKey,
	real,
	sqliteTable,
	text,
	unique,
} from 'drizzle-orm/sqlite-core';

const autoTimestampColumn = () =>
	integer({ mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`);

/**
 * LibSQL F32_BLOB implementation.
 *
 * Sources:
 * - Turso Docs: "Storing embeddings as raw bytes"
 * - Drizzle Issue #3899 (Discussion on driverData types)
 */
export const libsqlVector = customType<{
	data: number[];
	config: { dimensions: number };
	configRequired: true;
	driverData: Buffer;
}>({
	dataType(config) {
		return `F32_BLOB(${config.dimensions})`;
	},
	fromDriver(value: Buffer) {
		// Convert binary blob back to numbers for your code to use
		// Note: Use the byteOffset/byteLength to ensure we read the view correctly
		return Array.from(new Float32Array(value.buffer, value.byteOffset, value.byteLength / 4));
	},
	toDriver(value: number[]) {
		// Convert numbers to raw binary before sending to DB.
		// This bypasses the need for the `vector32()` SQL function parsing.
		return Buffer.from(new Float32Array(value).buffer);
	},
});

export const UserTable = sqliteTable('user', {
	id: text().primaryKey(),
	name: text().notNull(),
	email: text().notNull().unique(),
	password: text().notNull(),
	role: text({ enum: ['USER', 'ADMIN'] })
		.default('USER')
		.notNull(),
	createdAt: autoTimestampColumn(),
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
	createdAt: autoTimestampColumn(),
});

export const WishlistItemTable = sqliteTable('wishlist_item', {
	id: text().notNull().primaryKey(),
	wishlistId: text()
		.notNull()
		.references(() => WishlistTable.id, { onDelete: 'cascade' }),
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
});

export const ReservationTable = sqliteTable('item_reservation', {
	itemId: text()
		.references(() => WishlistItemTable.id, { onDelete: 'cascade' })
		.primaryKey(),
	wishlistId: text()
		.notNull()
		.references(() => WishlistTable.id, { onDelete: 'cascade' }),
	userId: text()
		.notNull()
		.references(() => UserTable.id, { onDelete: 'cascade' }),
	createdAt: autoTimestampColumn(),
});

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

export const DocumentationTable = sqliteTable(
	'doc_embeddings',
	{
		id: text().primaryKey(),
		content: text().notNull(),
		contentHash: text().notNull().unique(),
		// Embedding vectors stored as blobs (specifically for Mistral)
		vector: libsqlVector({ dimensions: 1024 }),
	},
	(table) => ({
		vectorIndex: index('docs_vector_idx').on(sql`libsql_vector_idx(${table.vector})`),
	}),
);

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

export const _ReservationRelations = relations(ReservationTable, ({ one }) => ({
	item: one(WishlistItemTable, {
		fields: [ReservationTable.itemId],
		references: [WishlistItemTable.id],
	}),
	reserver: one(UserTable, {
		fields: [ReservationTable.userId],
		references: [UserTable.id],
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
