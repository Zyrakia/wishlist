import { and, eq, notInArray } from 'drizzle-orm';
import { Err, Ok } from 'ts-results-es';

import { db } from '../db';
import { WishlistItemTable } from '../db/schema';
import { buildUpsertSet } from '../util/drizzle';
import { createService, DomainError, unwrap } from '../util/service';

export const ItemsService = createService(db(), {
	/**
	 * Creates a wishlist item record.
	 *
	 * @param data the item data to insert
	 */
	create: async (client, data: typeof WishlistItemTable.$inferInsert) => {
		await client.insert(WishlistItemTable).values(data);
		return Ok(undefined);
	},

	/**
	 * Fetches an item by ID within a wishlist.
	 *
	 * @param itemId the item ID to lookup
	 * @param wishlistId the wishlist ID to scope by
	 */
	getById: async (client, itemId: string, wishlistId: string) => {
		const item = await client.query.WishlistItemTable.findFirst({
			where: (t, { and, eq }) => and(eq(t.id, itemId), eq(t.wishlistId, wishlistId)),
		});

		return Ok(item);
	},

	getByIdOrErr: async (client, itemId: string, wishlistId: string) => {
		const item = await client.query.WishlistItemTable.findFirst({
			where: (t, { and, eq }) => and(eq(t.id, itemId), eq(t.wishlistId, wishlistId)),
		});
		if (!item) return Err(DomainError.of('Item not found'));
		return Ok(item);
	},

	/**
	 * Updates an item by ID scoped to a wishlist.
	 *
	 * @param itemId the item ID to update
	 * @param wishlistId the wishlist ID to scope by
	 * @param data the fields to update
	 */
	updateById: async (
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

		return Ok(undefined);
	},

	/**
	 * Updates the favorited flag for an item scoped to a wishlist.
	 *
	 * @param itemId the item ID to update
	 * @param wishlistId the wishlist ID to scope by
	 * @param favorited the new favorited flag
	 */
	updateFavoritedById: async (
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
		return Ok(undefined);
	},

	/**
	 * Reorders items within a wishlist.
	 *
	 * @param wishlistId the wishlist ID to scope by
	 * @param items the items and order values to update
	 */
	reorder: async (
		client,
		wishlistId: string,
		items: Array<{ id: string; order: number }>,
	) => {
		await client.transaction(async (tx) => {
			await Promise.all(
				items.map(async ({ id: itemId, order }) => {
					unwrap(await ItemsService.$with(tx).updateById(itemId, wishlistId, { order }));
				}),
			);
		});
		return Ok(undefined);
	},

	/**
	 * Deletes an item by ID scoped to a wishlist.
	 *
	 * @param itemId the item ID to delete
	 * @param wishlistId the wishlist ID to scope by
	 */
	deleteById: async (client, itemId: string, wishlistId: string) => {
		await client
			.delete(WishlistItemTable)
			.where(
				and(eq(WishlistItemTable.id, itemId), eq(WishlistItemTable.wishlistId, wishlistId)),
			);
		return Ok(undefined);
	},

	/**
	 * Deletes items scoped to a connection.
	 *
	 * @param connectionId the connection ID to scope by
	 */
	deleteByConnectionId: async (
		client,
		connectionId: string,
		...exceptIds: string[]
	) => {
		const idMatches = eq(WishlistItemTable.connectionId, connectionId);
		const where =
			exceptIds.length !== 0
				? and(idMatches, notInArray(WishlistItemTable.id, exceptIds))
				: idMatches;

		await client.delete(WishlistItemTable).where(where);
		return Ok(undefined);
	},

	/**
	 * Upserts a collection of items.
	 *
	 * @param items the items to insert or update
	 */
	upsert: async (client, items: Array<typeof WishlistItemTable.$inferInsert>) => {
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
		return Ok(undefined);
	},
});
