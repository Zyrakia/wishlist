import { form, getRequestEvent, query } from '$app/server';
import { WishlistSchema } from '$lib/schemas/wishlist';
import { verifyAuth } from '$lib/server/auth';
import { WishlistService } from '$lib/server/services/wishlist';
import { unwrap, unwrapOrDomain } from '$lib/server/util/service';
import { UrlBuilder } from '$lib/util/url';
import { randomUUID } from 'crypto';
import z from 'zod';

import { error, redirect } from '@sveltejs/kit';

export const isWishlistSlugOpen = query(z.object({ slug: z.string() }), async ({ slug }) => {
	const existing = await getWishlist({ slug });
	return existing === undefined;
});

export const createWishlist = form(WishlistSchema, async (data, invalid) => {
	const user = verifyAuth();

	unwrapOrDomain(
		await WishlistService.createWithSlugCheck({
			id: randomUUID(),
			userId: user.id,
			...data,
		}),
		(m) => invalid(invalid.slug(m)),
	);

	redirect(303, UrlBuilder.from('/lists').segment(data.slug).toPath());
});

export const updateWishlist = form(WishlistSchema.partial(), async (data, invalid) => {
	const user = verifyAuth();

	const {
		params: { wishlist_slug },
	} = getRequestEvent();
	if (!wishlist_slug) error(400, 'Cannot update wishlist without slug');

	const [updated] = unwrapOrDomain(
		await WishlistService.updateBySlugForOwnerChecked(wishlist_slug, user.id, data),
		(m) => invalid(invalid.slug(m)),
	);

	if (updated) {
		unwrap(await WishlistService.touchById(updated.id));
		redirect(
			303,
			UrlBuilder.from('/lists')
				.segment(data.slug ?? wishlist_slug)
				.toPath(),
		);
	} else error(400, 'No wishlist can be updated');
});

export const getWishlist = query(z.object({ slug: z.string() }), async ({ slug }) => {
	return unwrapOrDomain(await WishlistService.getBySlugOrErr(slug), () => undefined);
});

const ItemSortSchema = z.enum(['alphabetical', 'created', 'price', 'user']);
const ItemDirectionSchema = z.enum(['asc', 'desc']);

export const getWishlistWithItems = query(
	z.object({ slug: z.string(), sort: ItemSortSchema, direction: ItemDirectionSchema }),
	async ({ slug, sort, direction }) => {
		return unwrap(await WishlistService.getBySlugWithItems(slug, sort, direction));
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

		if (!data.confirm)
			redirect(
				303,
				UrlBuilder.from('/lists').segment(data.slug).segment('delete-confirm').toPath(),
			);

		const wl = unwrapOrDomain(
			await WishlistService.getBySlugAndIdForOwnerOrErr(data.slug, data.id, user.id),
			invalid,
		);

		unwrap(await WishlistService.deleteById(wl.id));
		redirect(303, '/');
	},
);

export const getWishlists = query(async () => {
	const user = verifyAuth({ failStrategy: 'login' });
	return unwrap(await WishlistService.listsForOwner(user.id));
});
