import { $ok } from '$lib/util/result';
import { and, eq, inArray } from 'drizzle-orm';

import { db } from '../db';
import { ReservationTable } from '../db/schema';
import { createService } from '../util/service';

export const ReservationsService = createService(db(), {
	/**
	 * Lists reservations for a user with related wishlist owners.
	 *
	 * @param userId the user ID to lookup
	 */
	listByUserWithOwners: async (client, userId: string) => {
		const reservations = await client.query.ReservationTable.findMany({
			where: (t, { eq }) => eq(t.userId, userId),
			with: {
				item: {
					columns: { id: true },
					with: { wishlist: { columns: { userId: true } } },
				},
			},
		});
		return $ok(reservations);
	},

	/**
	 * Lists reservations for a wishlist.
	 *
	 * @param wishlistId the wishlist ID to scope by
	 */
	listByWishlistId: async (client, wishlistId: string) => {
		const reservations = await client.query.ReservationTable.findMany({
			where: (t, { eq }) => eq(t.wishlistId, wishlistId),
		});
		return $ok(reservations);
	},

	/**
	 * Fetches a reservation by item ID.
	 *
	 * @param itemId the item ID to lookup
	 */
	getByItemId: async (client, itemId: string) => {
		const reservation = await client.query.ReservationTable.findFirst({
			where: (t, { eq }) => eq(t.itemId, itemId),
		});
		return $ok(reservation);
	},

	/**
	 * Creates a reservation record.
	 *
	 * @param data the reservation data to insert
	 */
	createReservation: async (client, data: typeof ReservationTable.$inferInsert) => {
		await client.insert(ReservationTable).values(data);
		return $ok();
	},

	/**
	 * Deletes a reservation for a user and item.
	 *
	 * @param userId the user ID to scope by
	 * @param itemId the item ID to scope by, can be multiple
	 */
	deleteByUserAndItems: async (client, userId: string, ...itemId: string[]) => {
		const itemSelector =
			itemId.length === 1
				? eq(ReservationTable.itemId, itemId[0])
				: inArray(ReservationTable.itemId, itemId);

		await client
			.delete(ReservationTable)
			.where(and(eq(ReservationTable.userId, userId), itemSelector));
		return $ok();
	},
});
