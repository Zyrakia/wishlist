import { count, eq, sql } from 'drizzle-orm';
import { Ok } from 'ts-results-es';

import { db } from '../db';
import { UserTable, WishlistConnectionTable } from '../db/schema';
import { createService } from '../util/service';

export const AdminService = createService(db(), {
	/**
	 * Paginates user records with totals.
	 *
	 * @param limit the page size to fetch
	 * @param offset the row offset to fetch
	 */
	listUsersPage: async (client, limit: number, offset: number) => {
		const [data, [{ total }]] = await Promise.all([
			client.query.UserTable.findMany({
				limit,
				offset,
				columns: { password: false },
			}),
			client.select({ total: count() }).from(UserTable),
		]);

		return Ok({ data, total });
	},

	/**
	 * Paginates connections with sync errors.
	 *
	 * @param limit the page size to fetch
	 * @param offset the row offset to fetch
	 */
	listErroredConnectionsPage: async (client, limit: number, offset: number) => {
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

		return Ok({ data, total });
	},

	/**
	 * Checks basic database connectivity.
	 *
	 * @return true when the database responds
	 */
	checkPing: async (client) => {
		await client
			.select({ ok: sql<number>`1` })
			.from(UserTable)
			.limit(1);
		return Ok(true);
	},
});
