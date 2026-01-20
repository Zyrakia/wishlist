import { form, getRequestEvent, query } from '$app/server';
import { WishlistSchema } from '$lib/schemas/wishlist';
import { verifyAuth } from '$lib/server/auth';
import { WishlistService } from '$lib/server/services/wishlist';
import { DomainError } from '$lib/server/util/service';
import { randomUUID } from 'crypto';
import z from 'zod';

import { error, redirect } from '@sveltejs/kit';

export const isWishlistSlugOpen = query(z.object({ slug: z.string() }), async ({ slug }) => {
	const existing = await getWishlist({ slug });
	return existing === undefined;
});

export const createWishlist = form(WishlistSchema, async (data, invalid) => {
	const user = verifyAuth();

	const created = await WishlistService.createWithSlugCheck({
		id: randomUUID(),
		userId: user.id,
		...data,
	});
	if (created.err) {
		if (DomainError.is(created.val)) return invalid(invalid.slug(created.val.message));
		throw created.val;
	}
	redirect(303, `/lists/${data.slug}`);
});

export const updateWishlist = form(WishlistSchema.partial(), async (data, invalid) => {
	const user = verifyAuth();

	const {
		params: { wishlist_slug },
	} = getRequestEvent();
	if (!wishlist_slug) error(400, 'Cannot update wishlist without slug');

	const updateResult = await WishlistService.updateBySlugForOwnerChecked(
		wishlist_slug,
		user.id,
		data,
	);
	if (updateResult.err) {
		if (DomainError.is(updateResult.val)) return invalid(invalid.slug(updateResult.val.message));
		throw updateResult.val;
	}

	const [updated] = updateResult.val;

	if (updated) {
		const touchResult = await WishlistService.touchById(updated.id);
		if (touchResult.err) throw touchResult.val;
		redirect(303, `/lists/${data.slug ?? wishlist_slug}`);
	} else error(400, 'No wishlist can be updated');
});

export const getWishlist = query(z.object({ slug: z.string() }), async ({ slug }) => {
	const result = await WishlistService.getBySlugOrErr(slug);
	if (result.err) {
		if (DomainError.is(result.val)) return undefined;
		throw result.val;
	}
	return result.val;
});

const ItemSortSchema = z.enum(['alphabetical', 'created', 'price', 'user']);
const ItemDirectionSchema = z.enum(['asc', 'desc']);

export const getWishlistWithItems = query(
	z.object({ slug: z.string(), sort: ItemSortSchema, direction: ItemDirectionSchema }),
	async ({ slug, sort, direction }) => {
		const result = await WishlistService.getBySlugWithItemsOrErr(
			slug,
			sort,
			direction,
		);
		if (result.err) {
			if (DomainError.is(result.val)) return undefined;
			throw result.val;
		}
		return result.val;
	},
);

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
	async (data, invalid) => {
		const user = verifyAuth();

		if (!data.confirm) redirect(303, `/lists/${data.slug}/delete-confirm`);

		const wlResult = await WishlistService.getBySlugAndIdForOwnerOrErr(
			data.slug,
			data.id,
			user.id,
		);
		if (wlResult.err) {
			if (DomainError.is(wlResult.val)) return invalid(wlResult.val.message);
			throw wlResult.val;
		}
		const wl = wlResult.val;

		const deleteResult = await WishlistService.deleteById(wl.id);
		if (deleteResult.err) throw deleteResult.val;
		redirect(303, '/');
	},
);

export const getWishlists = query(async () => {
	const user = verifyAuth({ failStrategy: 'login' });

	const listResult = await WishlistService.listForOwner(user.id);
	if (listResult.err) throw listResult.val;
	return listResult.val;
});
