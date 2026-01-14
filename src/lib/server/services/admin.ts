import { asc, count, eq, sql } from 'drizzle-orm';
import { db } from '../db';
import { UserTable, WishlistConnectionTable } from '../db/schema';
import { createClientService } from '../util/client-service';

export const AdminService = createClientService(db(), {
	/**
	 * Paginates user records with totals.
	 *
	 * @param limit the page size to fetch
	 * @param offset the row offset to fetch
	 */
	paginateUsers: async (client, limit: number, offset: number) => {
		const [data, [{ total }]] = await Promise.all([
			client.query.UserTable.findMany({
				limit,
				offset,
				columns: { password: false },
			}),
			client.select({ total: count() }).from(UserTable),
		]);

		return { data, total };
	},

	/**
	 * Paginates connections with sync errors.
	 *
	 * @param limit the page size to fetch
	 * @param offset the row offset to fetch
	 */
	paginateErroredConnections: async (client, limit: number, offset: number) => {
		const [data, [{ total }]] = await Promise.all([
			client.query.WishlistConnectionTable.findMany({
				limit,
				offset,
				orderBy: (t, { asc }) => asc(t.lastSyncedAt),
				where: (t, { eq }) => eq(t.syncError, true),
				with: {
					wishlist: {
						columns: { id: true, name: true, slug: true },
						with: { user: { columns: { id: true, name: true } } },
					},
				},
			}),
			client
				.select({ total: count() })
				.from(WishlistConnectionTable)
				.where(eq(WishlistConnectionTable.syncError, true)),
		]);

		return { data, total };
	},

	/**
	 * Checks basic database connectivity.
	 *
	 * @return true when the database responds
	 */
	ping: async (client) => {
		await client
			.select({ ok: sql<number>`1` })
			.from(UserTable)
			.limit(1);
		return true;
	},
});
