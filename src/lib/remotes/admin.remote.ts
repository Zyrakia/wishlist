import { form, query } from '$app/server';
import z from 'zod';
import { checkRole } from './auth.remote';
import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { syncListConnection } from '$lib/server/generation/connection-sync';
import { UserTable, WishlistConnectionTable } from '$lib/server/db/schema';
import { count, eq } from 'drizzle-orm';

const verifyAdmin = async () => {
	const isRole = await checkRole({ targetRole: 'ADMIN' });
	if (!isRole) error(401, 'You do not have permission to access this resource');
};

export const paginateUsers = query(
	z.object({
		limit: z.number().min(10).multipleOf(10).max(100),
		page: z.number().int().min(0),
	}),
	async ({ limit, page }) => {
		await new Promise((res) => setTimeout(res, 2000));

		await verifyAdmin();

		const offset = page * limit;
		const [data, [{ total }]] = await Promise.all([
			db().query.UserTable.findMany({
				limit,
				offset,
				columns: { password: false },
			}),
			db().select({ total: count() }).from(UserTable),
		]);

		return { data, total };
	},
);

export const paginateErroredConnections = query(
	z.object({
		limit: z.number().min(10).multipleOf(10).max(100),
		page: z.number().int().min(0),
	}),
	async ({ page, limit }) => {
		await verifyAdmin();

		const offset = page * limit;
		const [data, [{ total }]] = await Promise.all([
			db().query.WishlistConnectionTable.findMany({
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
			db()
				.select({ total: count() })
				.from(WishlistConnectionTable)
				.where(eq(WishlistConnectionTable.syncError, true)),
		]);

		return { data, total };
	},
);

export const forceResync = form(
	z.object({ connectionId: z.string() }),
	async ({ connectionId }) => {
		await syncListConnection(connectionId);
	},
);
