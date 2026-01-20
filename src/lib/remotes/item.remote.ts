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
import { DomainError } from '$lib/server/util/service';

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

		const wlResult = await WishlistService.getBySlugForOwnerOrErr(wishlist_slug, user.id);
		if (wlResult.err) {
			if (DomainError.is(wlResult.val)) return invalid(wlResult.val.message);
			throw wlResult.val;
		}
		const wl = wlResult.val;

		data.continue ??= false;
		const redirectUrl = data.continue
			? `${url.pathname}?continue=true`
			: `/lists/${wishlist_slug}`;

		const createResult = await ItemsService.create({
			id: randomUUID(),
			wishlistId: wl.id,
			...data,
		});
		if (createResult.err) throw createResult.val;

		const touchResult = await WishlistService.touchById(wl.id);
		if (touchResult.err) throw touchResult.val;
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

	const wlResult = await WishlistService.getBySlugForOwnerOrErr(wishlist_slug, user.id);
	if (wlResult.err) {
		if (DomainError.is(wlResult.val)) return invalid(wlResult.val.message);
		throw wlResult.val;
	}
	const wl = wlResult.val;

	const updateResult = await ItemsService.updateById(item_id, wl.id, data);
	if (updateResult.err) throw updateResult.val;

	const touchResult = await WishlistService.touchById(wl.id);
	if (touchResult.err) throw touchResult.val;
	redirect(303, `/lists/${wishlist_slug}`);
});

export const setItemFavorited = form(
	z.object({ favorited: strBoolean(), itemId: z.string() }),
	async ({ favorited, itemId }, invalid) => {
		const {
			params: { wishlist_slug },
		} = getRequestEvent();

		const user = verifyAuth();
		if (!wishlist_slug) error(400, 'A wishlist slug is required while favoriting an item');

		const wlResult = await WishlistService.getBySlugForOwnerOrErr(wishlist_slug, user.id);
		if (wlResult.err) {
			if (DomainError.is(wlResult.val)) return invalid(wlResult.val.message);
			throw wlResult.val;
		}
		const wl = wlResult.val;

		const updateResult = await ItemsService.updateFavoritedById(itemId, wl.id, favorited);
		if (updateResult.err) throw updateResult.val;
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

		const wlResult = await WishlistService.getBySlugForOwnerOrErr(wishlist_slug, user.id);
		if (wlResult.err) throw wlResult.val;
		const wl = wlResult.val;

		const reorderResult = await ItemsService.reorder(wl.id, items);
		if (reorderResult.err) throw reorderResult.val;
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
			redirect(303, `/lists/${data.wishlistSlug}/item/${data.itemId}/delete-confirm`);

		const wlResult = await WishlistService.getBySlugForOwnerOrErr(
			data.wishlistSlug,
			user.id,
		);
		if (wlResult.err) {
			if (DomainError.is(wlResult.val)) return invalid(wlResult.val.message);
			throw wlResult.val;
		}
		const wl = wlResult.val;

		const deleteResult = await ItemsService.deleteById(data.itemId, wl.id);
		if (deleteResult.err) throw deleteResult.val;

		const touchResult = await WishlistService.touchById(wl.id);
		if (touchResult.err) throw touchResult.val;
		redirect(303, `/lists/${data.wishlistSlug}`);
	},
);

export const getItemForWishlist = query(
	z.object({ wishlistId: z.string(), itemId: z.string() }),
	async ({ wishlistId, itemId }) => {
		const itemResult = await ItemsService.getById(itemId, wishlistId);
		if (itemResult.err) throw itemResult.val;
		return itemResult.val;
	},
);

export const generateItem = form(z.object({ url: RequiredUrlSchema }), async (data, invalid) => {
	verifyAuth();

	const genResult = await generateItemCandidate(data.url);
	if (genResult.ok) return genResult.val;
	if (DomainError.is(genResult.val)) return invalid(genResult.val.message);
	throw genResult.val;
});
