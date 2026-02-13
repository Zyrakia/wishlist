import { form, getRequestEvent, query } from '$app/server';

import { ItemSchema, RequiredUrlSchema } from '$lib/schemas/item';
import { verifyAuth } from '$lib/server/auth';
import { generateItemCandidate } from '$lib/server/generation/item-generator';
import { UrlBuilder } from '$lib/util/url';
import { strBoolean } from '$lib/util/zod';
import { randomUUID } from 'node:crypto';
import z from 'zod';

import { error, redirect } from '@sveltejs/kit';

import { ItemsService } from '../server/services/items';
import { WishlistService } from '../server/services/wishlist';
import { unwrap, unwrapOrDomain } from '$lib/server/util/service';

export const createItem = form(
	ItemSchema.safeExtend({
		continue: z.boolean().optional(),
	}),
	async (data, invalid) => {
		const {
			params: { wishlist_slug },
			url,
		} = getRequestEvent();

		const user = verifyAuth();
		if (!wishlist_slug) error(400, 'A wishlist slug is required while creating an item');

		const wl = unwrapOrDomain(
			await WishlistService.getBySlugForOwnerOrErr(wishlist_slug, user.id),
			invalid,
		);

		data.continue ??= false;
		const redirectUrl = data.continue
			? UrlBuilder.from(url.pathname).param('continue', true).toPath()
			: UrlBuilder.from('/lists').segment(wishlist_slug).toPath();

		unwrap(await ItemsService.create({ id: randomUUID(), wishlistId: wl.id, ...data }));
		unwrap(await WishlistService.touchById(wl.id));
		redirect(303, redirectUrl);
	},
);

export const updateItem = form(ItemSchema.partial(), async (data, invalid) => {
	const {
		params: { wishlist_slug, item_id },
	} = getRequestEvent();

	const user = verifyAuth();

	if (!wishlist_slug || !item_id)
		error(400, 'A wishlist slug and item ID is required while updating an item');

	const wl = unwrapOrDomain(
		await WishlistService.getBySlugForOwnerOrErr(wishlist_slug, user.id),
		invalid,
	);

	unwrap(await ItemsService.updateById(item_id, wl.id, data));
	unwrap(await WishlistService.touchById(wl.id));
	redirect(303, UrlBuilder.from('/lists').segment(wishlist_slug).toPath());
});

export const setItemFavorited = form(
	z.object({ favorited: strBoolean(), itemId: z.string() }),
	async ({ favorited, itemId }, invalid) => {
		const {
			params: { wishlist_slug },
		} = getRequestEvent();

		const user = verifyAuth();
		if (!wishlist_slug) error(400, 'A wishlist slug is required while favoriting an item');

		const wl = unwrapOrDomain(
			await WishlistService.getBySlugForOwnerOrErr(wishlist_slug, user.id),
			invalid,
		);

		unwrap(await ItemsService.updateFavoritedById(itemId, wl.id, favorited));
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

		const wl = unwrap(await WishlistService.getBySlugForOwnerOrErr(wishlist_slug, user.id));
		unwrap(await ItemsService.reorder(wl.id, items));
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
	async (data, invalid) => {
		const user = verifyAuth();

		if (!data.confirm)
			redirect(
				303,
				UrlBuilder.from('/lists')
					.segment(data.wishlistSlug)
					.segment('item')
					.segment(data.itemId)
					.segment('delete-confirm')
					.toPath(),
			);

		const wl = unwrapOrDomain(
			await WishlistService.getBySlugForOwnerOrErr(data.wishlistSlug, user.id),
			invalid,
		);

		unwrap(await ItemsService.deleteById(data.itemId, wl.id));
		unwrap(await WishlistService.touchById(wl.id));
		redirect(303, UrlBuilder.from('/lists').segment(data.wishlistSlug).toPath());
	},
);

export const getItemForWishlist = query(
	z.object({ wishlistId: z.string(), itemId: z.string() }),
	async ({ wishlistId, itemId }) => {
		return unwrap(await ItemsService.getById(itemId, wishlistId));
	},
);

export const generateItem = form(z.object({ url: RequiredUrlSchema }), async (data, invalid) => {
	verifyAuth();
	return unwrapOrDomain(await generateItemCandidate(data.url), invalid);
});
