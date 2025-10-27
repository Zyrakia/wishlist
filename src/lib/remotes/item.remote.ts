import { form, getRequestEvent } from '$app/server';
import { WishlistItemTable } from '../server/db/schema';
import { db } from '../server/db';
import { error, redirect } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { ItemSchema } from '$lib/schemas/item';
import z from 'zod';
import { generateItemCandidates } from '$lib/server/item-generator/item-generator';

export const createItem = form(ItemSchema, async (data) => {
	const {
		params: { wishlist_slug },
		locals: { user },
	} = getRequestEvent();

	// if (!user) error(401);
	if (!wishlist_slug) error(400, 'A wishlist slug is required while creating an item');

	const wl = await db.query.WishlistTable.findFirst({
		where: (t, { and, eq }) => and(/* eq(t.userId, user.id), */ eq(t.slug, wishlist_slug)),
	});

	if (!wl) error(400, 'Invalid wishlist slug provided');

	await db.insert(WishlistItemTable).values({
		id: randomUUID(),
		wishlistId: wl.id,
		createdAt: new Date(),
		...data,
	});

	redirect(303, `/${wishlist_slug}`);
});

export const updateItem = form(ItemSchema.partial(), async (data) => {
	const {
		params: { wishlist_slug, item_id },
		locals: { user },
	} = getRequestEvent();

	// if (!user) error(401);
	if (!wishlist_slug || !item_id)
		error(400, 'A wishlist slug and item ID is required while updating an item');

	const wl = await db.query.WishlistTable.findFirst({
		where: (t, { and, eq }) => and(/* eq(t.userId, user.id), */ eq(t.slug, wishlist_slug)),
	});

	if (!wl) error(400, 'Invalid wishlist slug provided');

	await db
		.update(WishlistItemTable)
		.set({ ...data })
		.where(and(eq(WishlistItemTable.id, item_id), eq(WishlistItemTable.wishlistId, wl.id)));

	redirect(303, `/${wishlist_slug}`);
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
		if (!data.confirm)
			redirect(303, `/${data.wishlistSlug}/item/${data.itemId}/delete-confirm`);

		const {
			locals: { user },
		} = getRequestEvent();

		// if (!user) error(401);
		const wl = await db.query.WishlistTable.findFirst({
			where: (t, { and, eq }) =>
				and(/* eq(t.userId, user.id), */ eq(t.slug, data.wishlistSlug)),
		});

		if (!wl) error(400, 'Invalid wishlist slug provided');

		await db
			.delete(WishlistItemTable)
			.where(
				and(eq(WishlistItemTable.id, data.itemId), eq(WishlistItemTable.wishlistId, wl.id)),
			);

		redirect(303, `/${data.wishlistSlug}`);
	},
);

export const generateItem = form(z.object({ url: ItemSchema.shape.url }), async (data) => {
	if (typeof data.url !== 'string') error(400, 'A URL is required to generate an item.');

	try {
		return await generateItemCandidates(data.url);
	} catch (err) {
		console.warn(err);
	}
});
