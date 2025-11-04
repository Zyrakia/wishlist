import { form, getRequestEvent, query } from '$app/server';
import { WishlistSchema } from '$lib/schemas/wishlist';
import { db } from '$lib/server/db';
import { WishlistItemTable, WishlistTable } from '$lib/server/db/schema';
import { error, redirect } from '@sveltejs/kit';
import { randomUUID } from 'crypto';
import { sql, eq, desc, asc } from 'drizzle-orm';
import z from 'zod';

export const isWishlistSlugOpen = query(z.object({ slug: z.string() }), async ({ slug }) => {
	const existing = await getWishlist({ slug });
	return existing === undefined;
});

export const createWishlist = form(WishlistSchema, async (data, invalid) => {
	const {
		locals: { user },
	} = getRequestEvent();
	if (!user) error(401);

	if (!(await isWishlistSlugOpen({ slug: data.slug }))) invalid(invalid.slug('Already taken'));

	await db.insert(WishlistTable).values({
		id: randomUUID(),
		userId: user.id,
		createdAt: new Date(),
		...data,
	});

	redirect(303, `/${data.slug}`);
});

export const updateWishlist = form(WishlistSchema.partial(), async (data, invalid) => {
	const {
		params: { wishlist_slug },
		locals: { user },
	} = getRequestEvent();
	if (!user) error(401);
	if (!wishlist_slug) error(400, 'Cannot update wishlist without slug');

	if (data.slug !== undefined && data.slug !== wishlist_slug) {
		const isOpen = await isWishlistSlugOpen({ slug: data.slug });
		if (!isOpen) invalid(invalid.slug('Already taken'));
	}

	const updateTarget = await db.query.WishlistTable.findFirst({
		where: (t, { and, eq }) => and(eq(t.slug, wishlist_slug), eq(t.userId, user.id)),
	});
	if (!updateTarget) error(400, 'No wishlist to edit was found');

	await db.update(WishlistTable).set(data).where(eq(WishlistTable.id, updateTarget.id));
	redirect(303, `/${data.slug ?? wishlist_slug}`);
});

export const getWishlist = query(z.object({ slug: z.string() }), async ({ slug }) => {
	return await db.query.WishlistTable.findFirst({
		where: (t, { eq }) => eq(t.slug, slug),
	});
});

export const deleteWishlist = form(
	z.object({
		slug: z.string(),
		id: z.string(),
		confirm: z.union([
			z.boolean(),
			z
				.string()
				.trim()
				.toLowerCase()
				.transform((v) => {
					if (v === 'yes' || v === 'true') return true;
					else return false;
				}),
		]),
	}),
	async (data) => {
		const {
			locals: { user },
		} = getRequestEvent();
		if (!user) error(401);

		if (!data.confirm) redirect(303, `/${data.slug}/delete-confirm`);

		const wl = await db.query.WishlistTable.findFirst({
			where: (t, { and, eq }) => and(eq(t.userId, user.id), eq(t.id, data.id), eq(t.slug, data.slug)),
		});

		if (!wl) error(400, 'Invalid wishlist slug and ID provided');

		await db.delete(WishlistTable).where(eq(WishlistTable.id, wl.id));
		redirect(303, '/');
	},
);

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
