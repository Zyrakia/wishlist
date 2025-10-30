import { getRequestEvent, query } from '$app/server';
import { db } from '$lib/server/db';
import { WishlistItemTable, WishlistTable } from '$lib/server/db/schema';
import { error } from '@sveltejs/kit';
import { sql, eq, desc } from 'drizzle-orm';
import z from 'zod';

export const getWishlistActivity = query(
	z.object({ limit: z.number().min(1).max(10) }),
	async () => {
		const {
			locals: { user },
		} = getRequestEvent();
		if (!user) error(401);

		const u = db
			.select({ id: WishlistTable.id })
			.from(WishlistTable)
			.where(eq(WishlistTable.userId, user.id))
			.as('u');

		const lastItem = db
			.select({
				wishlistId: WishlistItemTable.wishlistId,
				lastItemAt: sql<number>`max(${WishlistItemTable.createdAt})`.as('lastItemAt'),
			})
			.from(WishlistItemTable)
			.innerJoin(u, eq(u.id, WishlistItemTable.wishlistId))
			.groupBy(WishlistItemTable.wishlistId)
			.as('lastItem');

		return db
			.select({ wishlist: WishlistTable, lastItemAt: lastItem.lastItemAt })
			.from(WishlistTable)
			.leftJoin(lastItem, eq(lastItem.wishlistId, WishlistTable.id))
			.where(eq(WishlistTable.userId, user.id))
			.orderBy(
				desc(sql`${lastItem.lastItemAt} IS NOT NULL`),
				desc(lastItem.lastItemAt),
				desc(WishlistTable.createdAt),
			);
	},
);
