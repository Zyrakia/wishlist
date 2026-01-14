import { form, getRequestEvent, query } from '$app/server';
import { verifyAuth } from '$lib/server/auth';
import { GroupsService } from '$lib/server/services/groups';
import { ItemsService } from '$lib/server/services/items';
import { ReservationsService } from '$lib/server/services/reservations';
import { WishlistService } from '$lib/server/services/wishlist';
import { unwrap } from '$lib/util/safe-call';
import { error } from '@sveltejs/kit';
import z from 'zod';
import { resolveMe } from './auth.remote';

export const reserveItem = form(z.object({ itemId: z.string() }), async ({ itemId }) => {
	const {
		params: { wishlist_slug },
	} = getRequestEvent();
	if (!wishlist_slug) error(400, 'A wishlist slug is required while reserving an item');

	const viewer = await resolveMe({});
	const wl = unwrap(await WishlistService.getBySlugNotOwned(wishlist_slug, viewer.id));

	if (!wl) error(400, 'Invalid wishlist slug provided');

	const item = unwrap(await ItemsService.getItemForWishlist(itemId, wl.id));

	if (!item) error(400, 'Invalid item ID provided');

	const existingReservation = unwrap(await ReservationsService.getByItemId(itemId));

	if (existingReservation) error(400, 'This item is already reserved');

	const sharesGroup = unwrap(await GroupsService.doesShareGroup(viewer.id, wl.userId));
	if (!sharesGroup) error(401, 'You cannot reserve items on this list');

	unwrap(
		await ReservationsService.createReservation({
			itemId: itemId,
			userId: viewer.id,
			wishlistId: wl.id,
		}),
	);
});

export const removeReservation = form(z.object({ itemId: z.string() }), async ({ itemId }) => {
	const viewer = verifyAuth();
	unwrap(await ReservationsService.deleteByUserAndItem(viewer.id, itemId));
});

export const getReservations = query(async () => {
	const {
		params: { wishlist_slug },
		locals,
	} = getRequestEvent();
	if (!wishlist_slug) error(400, 'A wishlist slug is required while retrieving reservations');

	const viewer = locals.user;
	if (!viewer) return;

	const wl = unwrap(await WishlistService.getBySlugNotOwned(wishlist_slug, viewer.id));

	if (!wl) return;

	const sharesGroup = unwrap(await GroupsService.doesShareGroup(viewer.id, wl.userId));
	if (!sharesGroup) return;

	return unwrap(await ReservationsService.listByWishlistId(wl.id));
});
