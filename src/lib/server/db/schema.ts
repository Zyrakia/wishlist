import { integer, primaryKey, sqliteTable, text, real } from 'drizzle-orm/sqlite-core';

export const UserTable = sqliteTable('user', {
	id: text().primaryKey(),
	createdAt: integer({ mode: 'timestamp' }).notNull(),
});

export const WishlistTable = sqliteTable('wishlist', {
	id: text().primaryKey(),
	userId: text()
		.notNull()
		.references(() => UserTable.id, { onDelete: 'cascade' }),
	slug: text().notNull(),
	name: text().notNull(),
	description: text().notNull(),
	createdAt: integer({ mode: 'timestamp' }).notNull(),
});

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
		createdAt: integer({ mode: 'timestamp' }).notNull(),
	},
	(t) => [primaryKey({ columns: [t.wishlistId, t.id] })],
);
