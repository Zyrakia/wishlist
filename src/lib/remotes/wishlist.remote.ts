import { form, getRequestEvent, query } from '$app/server';
import { WishlistSchema } from '$lib/schemas/wishlist';
import { verifyAuth } from '$lib/server/auth';
import { WishlistService } from '$lib/server/services/wishlist';
import { $unwrap } from '$lib/util/result';
import { randomUUID } from 'crypto';
import z from 'zod';

import { error, redirect } from '@sveltejs/kit';

export const isWishlistSlugOpen = query(z.object({ slug: z.string() }), async ({ slug }) => {
	const existing = await getWishlist({ slug });
	return existing === undefined;
});

export const createWishlist = form(WishlistSchema, async (data, invalid) => {
	const user = verifyAuth();

	if (!(await isWishlistSlugOpen({ slug: data.slug }))) invalid(invalid.slug('Already taken'));

	$unwrap(
		await WishlistService.createWishlist({
			id: randomUUID(),
			userId: user.id,
			...data,
		}),
	);

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

	const [updated] = $unwrap(
		await WishlistService.updateBySlugForUser(wishlist_slug, user.id, data),
	);

	if (updated) {
		$unwrap(await WishlistService.touchList(updated.id));
		redirect(303, `/lists/${data.slug ?? wishlist_slug}`);
	} else error(400, 'No wishlist can be updated');
});

export const getWishlist = query(z.object({ slug: z.string() }), async ({ slug }) => {
	return $unwrap(await WishlistService.getBySlug(slug));
});

const ItemSortSchema = z.enum(['alphabetical', 'created', 'price', 'user']);
const ItemDirectionSchema = z.enum(['asc', 'desc']);

export const getWishlistWithItems = query(
	z.object({ slug: z.string(), sort: ItemSortSchema, direction: ItemDirectionSchema }),
	async ({ slug, sort, direction }) => {
		return $unwrap(await WishlistService.getWithItems(slug, sort, direction));
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
	async (data) => {
		const user = verifyAuth();

		if (!data.confirm) redirect(303, `/lists/${data.slug}/delete-confirm`);

		const wl = $unwrap(
			await WishlistService.getBySlugAndIdForUser(data.slug, data.id, user.id),
		);

		if (!wl) error(400, 'Invalid wishlist slug and ID provided');

		$unwrap(await WishlistService.deleteById(wl.id));
		redirect(303, '/');
	},
);

export const getWishlists = query(async () => {
	const user = verifyAuth({ failStrategy: 'login' });

	return $unwrap(await WishlistService.listByUserId(user.id));
});
