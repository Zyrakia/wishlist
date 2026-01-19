import { $ok, $unwrap } from '$lib/util/result';
import { and, eq, notInArray } from 'drizzle-orm';

import { db } from '../db';
import { WishlistItemTable } from '../db/schema';
import { buildUpsertSet } from '../util/drizzle';
import { createService } from '../util/service';

export const ItemsService = createService(db(), {
	/**
	 * Creates a wishlist item record.
	 *
	 * @param data the item data to insert
	 */
	createItem: async (client, data: typeof WishlistItemTable.$inferInsert) => {
		await client.insert(WishlistItemTable).values(data);
		return $ok();
	},

	/**
	 * Fetches an item by ID within a wishlist.
	 *
	 * @param itemId the item ID to lookup
	 * @param wishlistId the wishlist ID to scope by
	 */
	getItemForWishlist: async (client, itemId: string, wishlistId: string) => {
		const item = await client.query.WishlistItemTable.findFirst({
			where: (t, { and, eq }) => and(eq(t.id, itemId), eq(t.wishlistId, wishlistId)),
		});

		return $ok(item);
	},

	/**
	 * Updates an item by ID scoped to a wishlist.
	 *
	 * @param itemId the item ID to update
	 * @param wishlistId the wishlist ID to scope by
	 * @param data the fields to update
	 */
	updateItemForWishlist: async (
		client,
		itemId: string,
		wishlistId: string,
		data: Partial<typeof WishlistItemTable.$inferInsert>,
	) => {
		await client
			.update(WishlistItemTable)
			.set({ ...data })
			.where(
				and(eq(WishlistItemTable.id, itemId), eq(WishlistItemTable.wishlistId, wishlistId)),
			);

		return $ok();
	},

	/**
	 * Updates the favorited flag for an item scoped to a wishlist.
	 *
	 * @param itemId the item ID to update
	 * @param wishlistId the wishlist ID to scope by
	 * @param favorited the new favorited flag
	 */
	updateFavoritedForWishlist: async (
		client,
		itemId: string,
		wishlistId: string,
		favorited: boolean,
	) => {
		await client
			.update(WishlistItemTable)
			.set({ favorited })
			.where(
				and(eq(WishlistItemTable.id, itemId), eq(WishlistItemTable.wishlistId, wishlistId)),
			);
		return $ok();
	},

	/**
	 * Reorders items within a wishlist.
	 *
	 * @param wishlistId the wishlist ID to scope by
	 * @param items the items and order values to update
	 */
	reorderItems: async (
		client,
		wishlistId: string,
		items: Array<{ id: string; order: number }>,
	) => {
		await client.transaction(async (tx) => {
			await Promise.all(
				items.map(async ({ id: itemId, order }) => {
					$unwrap(
						await ItemsService.$with(tx).updateItemForWishlist(itemId, wishlistId, {
							order,
						}),
					);
				}),
			);
		});
		return $ok();
	},

	/**
	 * Deletes an item by ID scoped to a wishlist.
	 *
	 * @param itemId the item ID to delete
	 * @param wishlistId the wishlist ID to scope by
	 */
	deleteItemForWishlist: async (client, itemId: string, wishlistId: string) => {
		await client
			.delete(WishlistItemTable)
			.where(
				and(eq(WishlistItemTable.id, itemId), eq(WishlistItemTable.wishlistId, wishlistId)),
			);
		return $ok();
	},

	/**
	 * Deletes items scoped to a connection.
	 *
	 * @param connectionId the connection ID to scope by
	 */
	deleteItemsByConnection: async (client, connectionId: string, ...exceptIds: string[]) => {
		const idMatches = eq(WishlistItemTable.connectionId, connectionId);
		const where =
			exceptIds.length !== 0
				? and(idMatches, notInArray(WishlistItemTable.id, exceptIds))
				: idMatches;

		await client.delete(WishlistItemTable).where(where);
		return $ok();
	},

	/**
	 * Upserts a collection of items.
	 *
	 * @param items the items to insert or update
	 */
	upsertItems: async (client, items: Array<typeof WishlistItemTable.$inferInsert>) => {
		await client
			.insert(WishlistItemTable)
			.values(items)
			.onConflictDoUpdate({
				target: WishlistItemTable.id,
				set: buildUpsertSet(
					WishlistItemTable,
					'name',
					'price',
					'priceCurrency',
					'imageUrl',
					'url',
				),
			});
		return $ok();
	},
});
