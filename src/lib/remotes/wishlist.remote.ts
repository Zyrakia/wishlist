import { form, getRequestEvent, query } from '$app/server';
import { WishlistSchema } from '$lib/schemas/wishlist';
import { db } from '$lib/server/db';
import { WishlistItemTable, WishlistTable } from '$lib/server/db/schema';
import { error, redirect } from '@sveltejs/kit';
import { randomUUID } from 'crypto';
import { sql, eq, desc, asc } from 'drizzle-orm';
import z from 'zod';

export const createWishlist = form(WishlistSchema, async (data, invalid) => {
	const {
		locals: { user },
	} = getRequestEvent();
	if (!user) error(401);

	const existing = await getWishlist({ slug: data.slug });
	if (existing) invalid(invalid.slug('Already taken'));

	await db.insert(WishlistTable).values({
		id: randomUUID(),
		userId: user.id,
		createdAt: new Date(),
		...data,
	});

	redirect(303, `/${data.slug}`);
});

export const getWishlist = query(z.object({ slug: z.string() }), async ({ slug }) => {
	return await db.query.WishlistTable.findFirst({
		where: (t, { eq }) => eq(t.slug, slug),
	});
});

export const getWishlistActivity = query(
	z.object({ limit: z.number().min(1).max(10) }),
	async ({ limit }) => {
		const {
			locals: { user },
		} = getRequestEvent();
		if (!user) error(401);

		const lastItem = db.$with('last_item').as(
			db
				.select({
					wishlistId: WishlistItemTable.wishlistId,
					modifiedAt: sql<number>`max(${WishlistItemTable.createdAt})`.as('modifiedAt'),
				})
				.from(WishlistItemTable)
				.innerJoin(WishlistTable, eq(WishlistTable.id, WishlistItemTable.wishlistId))
				.where(eq(WishlistTable.userId, user.id))
				.groupBy(WishlistItemTable.wishlistId),
		);

		const sortGroup = sql<number>`CASE WHEN ${lastItem.modifiedAt} IS NULL THEN 0 ELSE 1 END`;

		const sortWhen = sql<number>`
      CASE
        WHEN ${lastItem.modifiedAt} IS NULL THEN ${WishlistTable.createdAt}
        ELSE ${lastItem.modifiedAt}
      END
    `;

		return db
			.with(lastItem)
			.select({
				wishlist: WishlistTable,
				lastItemAt: lastItem.modifiedAt,
			})
			.from(WishlistTable)
			.leftJoin(lastItem, eq(lastItem.wishlistId, WishlistTable.id))
			.where(eq(WishlistTable.userId, user.id))
			.orderBy(asc(sortGroup), desc(sortWhen))
			.limit(limit);
	},
);
