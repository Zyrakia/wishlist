import { form, getRequestEvent } from '$app/server';
import { ItemSchema, RequiredUrlSchema } from '$lib/schemas/item';
import { verifyAuth } from '$lib/server/auth';
import { generateItemCandidates } from '$lib/server/item-generator/item-generator';
import { and, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import z from 'zod';

import { error, redirect } from '@sveltejs/kit';

import { db } from '../server/db';
import { WishlistItemTable } from '../server/db/schema';
import { touchList } from './wishlist.remote';

export const createItem = form(
	ItemSchema.extend({
		continue: z.boolean().optional(),
	}),
	async (data) => {
		const {
			params: { wishlist_slug },
			url,
		} = getRequestEvent();

		const user = verifyAuth();
		if (!wishlist_slug) error(400, 'A wishlist slug is required while creating an item');

		const wl = await db().query.WishlistTable.findFirst({
			where: (t, { and, eq }) => and(eq(t.userId, user.id), eq(t.slug, wishlist_slug)),
		});

		if (!wl) error(400, 'Invalid wishlist slug provided');

		data.continue ??= false;
		const redirectUrl = data.continue
			? `${url.pathname}?continue=true`
			: `/lists/${wishlist_slug}`;

		await db()
			.insert(WishlistItemTable)
			.values({
				id: randomUUID(),
				wishlistId: wl.id,
				...data,
			});

		touchList({ id: wl.id });
		redirect(303, redirectUrl);
	},
);

export const updateItem = form(ItemSchema.partial(), async (data) => {
	const {
		params: { wishlist_slug, item_id },
	} = getRequestEvent();

	const user = verifyAuth();

	if (!wishlist_slug || !item_id)
		error(400, 'A wishlist slug and item ID is required while updating an item');

	const wl = await db().query.WishlistTable.findFirst({
		where: (t, { and, eq }) => and(eq(t.userId, user.id), eq(t.slug, wishlist_slug)),
	});

	if (!wl) error(400, 'Invalid wishlist slug provided');

	await db()
		.update(WishlistItemTable)
		.set({ ...data })
		.where(and(eq(WishlistItemTable.id, item_id), eq(WishlistItemTable.wishlistId, wl.id)));

	touchList({ id: wl.id });
	redirect(303, `/lists/${wishlist_slug}`);
});

export const deleteItem = form(
	z.object({
		wishlistSlug: z.string(),
		itemId: z.string(),
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

		if (!data.confirm)
			redirect(303, `/lists/${data.wishlistSlug}/item/${data.itemId}/delete-confirm`);

		const wl = await db().query.WishlistTable.findFirst({
			where: (t, { and, eq }) => and(eq(t.userId, user.id), eq(t.slug, data.wishlistSlug)),
		});

		if (!wl) error(400, 'Invalid wishlist slug provided');

		await db()
			.delete(WishlistItemTable)
			.where(
				and(eq(WishlistItemTable.id, data.itemId), eq(WishlistItemTable.wishlistId, wl.id)),
			);

		touchList({ id: wl.id });
		redirect(303, `/lists/${data.wishlistSlug}`);
	},
);

export const generateItem = form(z.object({ url: RequiredUrlSchema }), async (data, invalid) => {
	verifyAuth();

	const res = await generateItemCandidates(data.url);
	if (res.success) {
		if (!res.candidate?.name || !res.candidate?.valid) {
			invalid('No product found');
		} else return { ...res.candidate, url: data.url };
	} else invalid(res.error);
});
