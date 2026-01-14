import { count, eq, sql } from 'drizzle-orm';
import { db } from '../db';
import { WishlistConnectionTable, WishlistItemTable } from '../db/schema';
import { createClientService } from '../util/client-service';

export const ConnectionsService = createClientService(db(), {
	/**
	 * Fetches a connection by ID.
	 *
	 * @param connectionId the connection ID to lookup
	 */
	getById: async (client, connectionId: string) => {
		return await client.query.WishlistConnectionTable.findFirst({
			where: (t, { eq }) => eq(t.id, connectionId),
		});
	},

	/**
	 * Fetches a connection with associated items.
	 *
	 * @param connectionId the connection ID to lookup
	 */
	getWithItems: async (client, connectionId: string) => {
		return await client.query.WishlistConnectionTable.findFirst({
			where: (t, { eq }) => eq(t.id, connectionId),
			with: { items: { columns: { id: true, url: true } } },
		});
	},

	/**
	 * Fetches a connection with its wishlist summary.
	 *
	 * @param connectionId the connection ID to lookup
	 */
	getWithWishlist: async (client, connectionId: string) => {
		return await client.query.WishlistConnectionTable.findFirst({
			where: (t, { eq }) => eq(t.id, connectionId),
			with: { wishlist: { columns: { userId: true, id: true, slug: true } } },
		});
	},

	/**
	 * Fetches a connection by URL and wishlist.
	 *
	 * @param url the connection URL to lookup
	 * @param wishlistId the wishlist ID to scope by
	 */
	getByUrlForWishlist: async (client, url: string, wishlistId: string) => {
		return await client.query.WishlistConnectionTable.findFirst({
			where: (t, { and, eq }) =>
				and(
					eq(sql<string>`LOWER(${t.url})`, url.toLowerCase()),
					eq(t.wishlistId, wishlistId),
				),
		});
	},

	/**
	 * Counts connections for a wishlist.
	 *
	 * @param wishlistId the wishlist ID to scope by
	 */
	countForWishlist: async (client, wishlistId: string) => {
		const [{ count: connectionCount = 0 }] = await client
			.select({ count: count() })
			.from(WishlistConnectionTable)
			.where(eq(WishlistConnectionTable.wishlistId, wishlistId));

		return connectionCount;
	},

	/**
	 * Creates a wishlist connection record.
	 *
	 * @param data the connection data to insert
	 */
	createConnection: async (client, data: typeof WishlistConnectionTable.$inferInsert) => {
		await client.insert(WishlistConnectionTable).values(data);
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
				await tx
					.delete(WishlistItemTable)
					.where(eq(WishlistItemTable.connectionId, connectionId));
			}

			await tx
				.delete(WishlistConnectionTable)
				.where(eq(WishlistConnectionTable.id, connectionId));
		});
	},

	/**
	 * Updates sync status fields for a connection.
	 *
	 * @param connectionId the connection ID to update
	 * @param data the sync status fields to update
	 */
	updateSyncStatus: async (
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
	},

	/**
	 * Fetches recent sync status for a set of connections.
	 *
	 * @param connectionIds the connection IDs to lookup
	 * @param recentCutoff the cutoff timestamp for recent syncs
	 */
	getRecentSyncs: async (client, connectionIds: string[], recentCutoff: Date) => {
		return await client.query.WishlistConnectionTable.findMany({
			where: (t, { and, eq, gte, inArray, or }) =>
				and(
					inArray(t.id, connectionIds),
					or(gte(t.lastSyncedAt, recentCutoff), eq(t.syncError, true)),
				),
			columns: { id: true, lastSyncedAt: true, syncError: true },
		});
	},
});
