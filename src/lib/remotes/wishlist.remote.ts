import { form, getRequestEvent, query } from '$app/server';
import { WishlistSchema } from '$lib/schemas/wishlist';
import { verifyAuth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { WishlistTable } from '$lib/server/db/schema';
import { randomUUID } from 'crypto';
import { and, eq } from 'drizzle-orm';
import z from 'zod';

import { error, redirect } from '@sveltejs/kit';

export const touchList = query(z.object({ id: z.string() }), async ({ id }) => {
	const user = verifyAuth({ failStrategy: 'error' });

	await db()
		.update(WishlistTable)
		.set({ activityAt: new Date() })
		.where(and(eq(WishlistTable.id, id), eq(WishlistTable.userId, user.id)));
});

export const isWishlistSlugOpen = query(z.object({ slug: z.string() }), async ({ slug }) => {
	const existing = await getWishlist({ slug });
	return existing === undefined;
});

export const createWishlist = form(WishlistSchema, async (data, invalid) => {
	const user = verifyAuth();

	if (!(await isWishlistSlugOpen({ slug: data.slug }))) invalid(invalid.slug('Already taken'));

	await db()
		.insert(WishlistTable)
		.values({
			id: randomUUID(),
			userId: user.id,
			...data,
		});

	redirect(303, `/lists/${data.slug}`);
});

export const updateWishlist = form(WishlistSchema.partial(), async (data, invalid) => {
	const user = verifyAuth();

	const {
		params: { wishlist_slug },
	} = getRequestEvent();
	if (!wishlist_slug) error(400, 'Cannot update wishlist without slug');

	if (data.slug !== undefined && data.slug !== wishlist_slug) {
		const isOpen = await isWishlistSlugOpen({ slug: data.slug });
		if (!isOpen) invalid(invalid.slug('Already taken'));
	}

	const [updated] = await db()
		.update(WishlistTable)
		.set({ ...data })
		.where(and(eq(WishlistTable.slug, wishlist_slug), eq(WishlistTable.userId, user.id)))
		.returning();

	if (updated) {
		touchList({ id: updated.id });
		redirect(303, `/lists/${data.slug ?? wishlist_slug}`);
	} else error(400, 'No wishlist can be updated');
});

export const getWishlist = query(z.object({ slug: z.string() }), async ({ slug }) => {
	return await db().query.WishlistTable.findFirst({
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
		const user = verifyAuth();

		if (!data.confirm) redirect(303, `/lists/${data.slug}/delete-confirm`);

		const wl = await db().query.WishlistTable.findFirst({
			where: (t, { and, eq }) =>
				and(eq(t.userId, user.id), eq(t.id, data.id), eq(t.slug, data.slug)),
		});

		if (!wl) error(400, 'Invalid wishlist slug and ID provided');

		await db().delete(WishlistTable).where(eq(WishlistTable.id, wl.id));
		redirect(303, '/');
	},
);

export const getWishlists = query(
	z.object({ limit: z.number().min(1).max(10) }),
	async ({ limit }) => {
		const user = verifyAuth({ failStrategy: 'login' });

		return await db().query.WishlistTable.findMany({
			where: (t, { eq }) => eq(t.userId, user.id),
			orderBy: (t, { desc }) => desc(t.createdAt),
			limit: limit,
		});
	},
);

export const getWishlistActivity = query(
	z.object({ limit: z.number().min(1).max(10) }),
	async ({ limit }) => {
		const user = verifyAuth({ failStrategy: 'login' });

		return await db().query.WishlistTable.findMany({
			where: (t, { eq }) => eq(t.userId, user.id),
			orderBy: (t, { desc }) => desc(t.activityAt),
			limit: limit,
		});
	},
);
