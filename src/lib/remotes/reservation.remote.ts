import { form, getRequestEvent, query } from '$app/server';
import { verifyAuth } from '$lib/server/auth';
import { GroupsService } from '$lib/server/services/groups';
import { ItemsService } from '$lib/server/services/items';
import { ReservationsService } from '$lib/server/services/reservations';
import { WishlistService } from '$lib/server/services/wishlist';
import { unwrap, unwrapOrDomain } from '$lib/server/util/service';
import { error } from '@sveltejs/kit';
import z from 'zod';
import { resolveMe } from './auth.remote';

export const reserveItem = form(
	z.object({ itemId: z.string() }),
	async ({ itemId }, invalid) => {
		const {
			params: { wishlist_slug },
		} = getRequestEvent();
		if (!wishlist_slug) error(400, 'A wishlist slug is required while reserving an item');

		const viewer = await resolveMe({});
		const wl = unwrapOrDomain(
			await WishlistService.getBySlugForNonOwnerOrErr(wishlist_slug, viewer.id),
			invalid,
		);

		unwrapOrDomain(await ItemsService.getByIdOrErr(itemId, wl.id), invalid);
		unwrapOrDomain(await ReservationsService.getByItemIdOrErr(itemId), invalid);
		unwrapOrDomain(await GroupsService.sharesByUserIdsOrErr(viewer.id, wl.userId), invalid);

		unwrap(
			await ReservationsService.create({ itemId: itemId, userId: viewer.id, wishlistId: wl.id }),
		);
	},
);

export const removeReservation = form(z.object({ itemId: z.string() }), async ({ itemId }) => {
	const viewer = verifyAuth();
	unwrap(await ReservationsService.deleteByUserAndItemIds(viewer.id, itemId));
});

export const getReservations = query(async () => {
	const {
		params: { wishlist_slug },
		locals,
	} = getRequestEvent();
	if (!wishlist_slug) error(400, 'A wishlist slug is required while retrieving reservations');

	const viewer = locals.user;
	if (!viewer) return;

	const wl = unwrapOrDomain(
		await WishlistService.getBySlugForNonOwnerOrErr(wishlist_slug, viewer.id),
		() => undefined,
	);
	if (!wl) return;

	const shares = unwrapOrDomain(
		await GroupsService.sharesByUserIdsOrErr(viewer.id, wl.userId),
		() => undefined,
	);
	if (!shares) return;

	return unwrap(await ReservationsService.listByWishlistId(wl.id));
});
