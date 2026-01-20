import { form, getRequestEvent, query } from '$app/server';
import { verifyAuth } from '$lib/server/auth';
import { GroupsService } from '$lib/server/services/groups';
import { ItemsService } from '$lib/server/services/items';
import { ReservationsService } from '$lib/server/services/reservations';
import { WishlistService } from '$lib/server/services/wishlist';
import { DomainError } from '$lib/server/util/service';
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
		const wlResult = await WishlistService.getBySlugForNonOwnerOrErr(
			wishlist_slug,
			viewer.id,
		);
		if (wlResult.err) {
			if (DomainError.is(wlResult.val)) return invalid(wlResult.val.message);
			throw wlResult.val;
		}
		const wl = wlResult.val;

		const itemResult = await ItemsService.getByIdOrErr(itemId, wl.id);
		if (itemResult.err) {
			if (DomainError.is(itemResult.val)) return invalid(itemResult.val.message);
			throw itemResult.val;
		}

		const reservationResult = await ReservationsService.getByItemIdOrErr(itemId);
		if (reservationResult.err) {
			if (DomainError.is(reservationResult.val)) return invalid(reservationResult.val.message);
			throw reservationResult.val;
		}

		const shareResult = await GroupsService.sharesByUserIdsOrErr(viewer.id, wl.userId);
		if (shareResult.err) {
			if (DomainError.is(shareResult.val)) return invalid(shareResult.val.message);
			throw shareResult.val;
		}

		const createResult = await ReservationsService.create({
			itemId: itemId,
			userId: viewer.id,
			wishlistId: wl.id,
		});
		if (createResult.err) throw createResult.val;
	},
);

export const removeReservation = form(
	z.object({ itemId: z.string() }),
	async ({ itemId }) => {
		const viewer = verifyAuth();
		const deleteResult = await ReservationsService.deleteByUserAndItemIds(
			viewer.id,
			itemId,
		);
		if (deleteResult.err) throw deleteResult.val;
	},
);

export const getReservations = query(async () => {
	const {
		params: { wishlist_slug },
		locals,
	} = getRequestEvent();
	if (!wishlist_slug) error(400, 'A wishlist slug is required while retrieving reservations');

	const viewer = locals.user;
	if (!viewer) return;

	const wlResult = await WishlistService.getBySlugForNonOwnerOrErr(wishlist_slug, viewer.id);
	if (wlResult.err) return;
	const wl = wlResult.val;

	const shareResult = await GroupsService.sharesByUserIdsOrErr(viewer.id, wl.userId);
	if (shareResult.err) return;

	const reservationsResult = await ReservationsService.listByWishlistId(wl.id);
	if (reservationsResult.err) throw reservationsResult.val;
	return reservationsResult.val;
});
