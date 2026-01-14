import { form, getRequestEvent, query } from '$app/server';
import { ItemSchema, RequiredUrlSchema } from '$lib/schemas/item';
import { verifyAuth } from '$lib/server/auth';
import { generateItemCandidate } from '$lib/server/generation/item-generator';
import { strBoolean } from '$lib/util/zod';
import { randomUUID } from 'node:crypto';
import z from 'zod';

import { error, redirect } from '@sveltejs/kit';

import { ItemsService } from '../server/services/items';
import { WishlistService } from '../server/services/wishlist';
import { unwrap } from '$lib/util/safe-call';

export const createItem = form(
	ItemSchema.safeExtend({
		continue: z.boolean().optional(),
	}),
	async (data) => {
		const {
			params: { wishlist_slug },
			url,
		} = getRequestEvent();

		const user = verifyAuth();
		if (!wishlist_slug) error(400, 'A wishlist slug is required while creating an item');

		const wl = unwrap(await WishlistService.getBySlugForUser(wishlist_slug, user.id));
		if (!wl) error(400, 'Invalid wishlist slug provided');

		data.continue ??= false;
		const redirectUrl = data.continue
			? `${url.pathname}?continue=true`
			: `/lists/${wishlist_slug}`;

		unwrap(
			await ItemsService.createItem({
				id: randomUUID(),
				wishlistId: wl.id,
				...data,
			}),
		);

		unwrap(await WishlistService.touchList(wl.id));
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

	const wl = unwrap(await WishlistService.getBySlugForUser(wishlist_slug, user.id));
	if (!wl) error(400, 'Invalid wishlist slug provided');

	unwrap(await ItemsService.updateItemForWishlist(item_id, wl.id, data));

	unwrap(await WishlistService.touchList(wl.id));
	redirect(303, `/lists/${wishlist_slug}`);
});

export const setItemFavorited = form(
	z.object({ favorited: strBoolean(), itemId: z.string() }),
	async ({ favorited, itemId }) => {
		const {
			params: { wishlist_slug },
		} = getRequestEvent();

		const user = verifyAuth();
		if (!wishlist_slug) error(400, 'A wishlist slug is required while favoriting an item');

		const wl = unwrap(await WishlistService.getBySlugForUser(wishlist_slug, user.id));

		if (!wl) error(400, 'Invalid wishlist slug provided');

		unwrap(await ItemsService.updateFavoritedForWishlist(itemId, wl.id, favorited));
	},
);

export const reorderItems = query(
	z.object({
		items: z.array(
			z.object({
				id: z.string(),
				order: z.number(),
			}),
		),
	}),
	async ({ items }) => {
		const {
			params: { wishlist_slug },
		} = getRequestEvent();

		const user = verifyAuth();
		if (!wishlist_slug) error(400, 'A wishlist slug is required while updating item ordering');

		const wl = unwrap(await WishlistService.getBySlugForUser(wishlist_slug, user.id));
		if (!wl) error(400, 'Invalid wishlist slug provided');

		unwrap(await ItemsService.reorderItems(wl.id, items));
	},
);

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

		const wl = unwrap(await WishlistService.getBySlugForUser(data.wishlistSlug, user.id));
		if (!wl) error(400, 'Invalid wishlist slug provided');

		unwrap(await ItemsService.deleteItemForWishlist(data.itemId, wl.id));

		unwrap(await WishlistService.touchList(wl.id));
		redirect(303, `/lists/${data.wishlistSlug}`);
	},
);

export const getItemForWishlist = query(
	z.object({ wishlistId: z.string(), itemId: z.string() }),
	async ({ wishlistId, itemId }) => {
		return unwrap(await ItemsService.getItemForWishlist(itemId, wishlistId));
	},
);

export const generateItem = form(z.object({ url: RequiredUrlSchema }), async (data, invalid) => {
	verifyAuth();

	const { data: candidate, error } = await generateItemCandidate(data.url);
	if (candidate) {
		if (!candidate.name || !candidate.valid) {
			invalid('No product found');
		} else return { ...candidate, url: data.url };
	} else if (typeof error === 'string') invalid(error);
});
