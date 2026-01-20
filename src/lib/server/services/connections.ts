import { count, eq, sql } from 'drizzle-orm';
import { Err, Ok } from 'ts-results';

import { db } from '../db';
import { WishlistConnectionTable } from '../db/schema';
import { createService, DomainError } from '../util/service';
import { ItemsService } from './items';

export const ConnectionsService = createService(db(), {
	/**
	 * Fetches a connection by ID.
	 *
	 * @param connectionId the connection ID to lookup
	 */
	getById: async (client, connectionId: string) => {
		const connection = await client.query.WishlistConnectionTable.findFirst({
			where: (t, { eq }) => eq(t.id, connectionId),
		});
		return Ok(connection);
	},

	/**
	 * Fetches a connection with associated items.
	 *
	 * @param connectionId the connection ID to lookup
	 */
	getByIdWithItems: async (client, connectionId: string) => {
		const connection = await client.query.WishlistConnectionTable.findFirst({
			where: (t, { eq }) => eq(t.id, connectionId),
			with: { items: { columns: { id: true, url: true } } },
		});
		return Ok(connection);
	},

	/**
	 * Fetches a connection with its wishlist summary.
	 *
	 * @param connectionId the connection ID to lookup
	 */
	getByIdWithWishlist: async (client, connectionId: string) => {
		const connection = await client.query.WishlistConnectionTable.findFirst({
			where: (t, { eq }) => eq(t.id, connectionId),
			with: { wishlist: { columns: { userId: true, id: true, slug: true } } },
		});
		return Ok(connection);
	},

	/**
	 * Fetches a connection by URL and wishlist.
	 *
	 * @param url the connection URL to lookup
	 * @param wishlistId the wishlist ID to scope by
	 */
	getByUrl: async (client, url: string, wishlistId: string) => {
		const connection = await client.query.WishlistConnectionTable.findFirst({
			where: (t, { and, eq }) =>
				and(
					eq(sql<string>`LOWER(${t.url})`, url.toLowerCase()),
					eq(t.wishlistId, wishlistId),
				),
		});
		return Ok(connection);
	},

	/**
	 * Counts connections for a wishlist.
	 *
	 * @param wishlistId the wishlist ID to scope by
	 */
	countByWishlistId: async (client, wishlistId: string) => {
		const [{ count: connectionCount = 0 }] = await client
			.select({ count: count() })
			.from(WishlistConnectionTable)
			.where(eq(WishlistConnectionTable.wishlistId, wishlistId));

		return Ok(connectionCount);
	},

	/**
	 * Creates a wishlist connection record.
	 *
	 * @param data the connection data to insert
	 */
	create: async (client, data: typeof WishlistConnectionTable.$inferInsert) => {
		await client.insert(WishlistConnectionTable).values(data);
		return Ok(undefined);
	},

	/**
	 * Deletes a connection by ID.
	 *
	 * @param connectionId the connection ID to delete
	 * @param deleteItems whether to delete associated items
	 */
	deleteById: async (client, connectionId: string, deleteItems: boolean) => {
		await client.transaction(async (tx) => {
			// By default, on connection delete, column on items is set to `null`
			if (deleteItems) {
				(await ItemsService.$with(tx).deleteByConnectionId(connectionId)).unwrap();
			}

			await tx
				.delete(WishlistConnectionTable)
				.where(eq(WishlistConnectionTable.id, connectionId));
		});
		return Ok(undefined);
	},

	/**
	 * Updates sync status fields for a connection.
	 *
	 * @param connectionId the connection ID to update
	 * @param data the sync status fields to update
	 */
	updateSyncStatusById: async (
		client,
		connectionId: string,
		data: Partial<
			Pick<typeof WishlistConnectionTable.$inferInsert, 'lastSyncedAt' | 'syncError'>
		>,
	) => {
		await client
			.update(WishlistConnectionTable)
			.set({ ...data })
			.where(eq(WishlistConnectionTable.id, connectionId));
		return Ok(undefined);
	},

	/**
	 * Fetches recent sync status for a set of connections.
	 *
	 * @param connectionIds the connection IDs to lookup
	 * @param recentCutoff the cutoff timestamp for recent syncs
	 */
	getRecentSyncsById: async (client, connectionIds: string[], recentCutoff: Date) => {
		const recent = await client.query.WishlistConnectionTable.findMany({
			where: (t, { and, eq, gte, inArray, or }) =>
				and(
					inArray(t.id, connectionIds),
					or(gte(t.lastSyncedAt, recentCutoff), eq(t.syncError, true)),
				),
			columns: { id: true, lastSyncedAt: true, syncError: true },
		});
		return Ok(recent);
	},
});
