import { relations } from 'drizzle-orm';
import { integer, primaryKey, sqliteTable, text, real } from 'drizzle-orm/sqlite-core';
import { createSelectSchema } from 'drizzle-zod';
import type z from 'zod';

export const UserTable = sqliteTable('user', {
	id: text().primaryKey(),
	name: text().notNull(),
	email: text().notNull().unique(),
	password: text().notNull(),
	createdAt: integer({ mode: 'timestamp' }).notNull(),
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
	createdAt: integer({ mode: 'timestamp' }).notNull(),
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
		createdAt: integer({ mode: 'timestamp' }).notNull(),
	},
	(t) => [primaryKey({ columns: [t.wishlistId, t.id] })],
);

export const _WishlistItemRelations = relations(WishlistItemTable, ({ one }) => ({
	wishlist: one(WishlistTable, {
		fields: [WishlistItemTable.wishlistId],
		references: [WishlistTable.id],
	}),
}));

const userSchema = createSelectSchema(UserTable);
const wishlistSchema = createSelectSchema(WishlistTable);
const wishlistItemSchema = createSelectSchema(WishlistItemTable);

export type User = z.infer<typeof userSchema>;
export type Wishlist = z.infer<typeof wishlistSchema>;
export type WishlistItem = z.infer<typeof wishlistItemSchema>;
