import { and, eq, inArray } from 'drizzle-orm';
import { Err, Ok } from 'ts-results';

import { db } from '../db';
import { ReservationTable } from '../db/schema';
import { createService, DomainError } from '../util/service';

export const ReservationsService = createService(db(), {
	/**
	 * Lists reservations for a user with related wishlist owners.
	 *
	 * @param userId the user ID to lookup
	 */
	listByUserIdWithOwners: async (client, userId: string) => {
		const reservations = await client.query.ReservationTable.findMany({
			where: (t, { eq }) => eq(t.userId, userId),
			with: {
				item: {
					columns: { id: true },
					with: { wishlist: { columns: { userId: true } } },
				},
			},
		});
		return Ok(reservations);
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
		return Ok(reservations);
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
		return Ok(reservation);
	},

	getByItemIdOrErr: async (client, itemId: string) => {
		const reservation = await client.query.ReservationTable.findFirst({
			where: (t, { eq }) => eq(t.itemId, itemId),
		});
		if (reservation) return Err(DomainError.of('Item already reserved'));
		return Ok(reservation);
	},

	/**
	 * Creates a reservation record.
	 *
	 * @param data the reservation data to insert
	 */
	create: async (client, data: typeof ReservationTable.$inferInsert) => {
		await client.insert(ReservationTable).values(data);
		return Ok(undefined);
	},

	/**
	 * Deletes a reservation for a user and item.
	 *
	 * @param userId the user ID to scope by
	 * @param itemId the item ID to scope by, can be multiple
	 */
	deleteByUserAndItemIds: async (client, userId: string, ...itemId: string[]) => {
		const itemSelector =
			itemId.length === 1
				? eq(ReservationTable.itemId, itemId[0])
				: inArray(ReservationTable.itemId, itemId);

		await client
			.delete(ReservationTable)
			.where(and(eq(ReservationTable.userId, userId), itemSelector));
		return Ok(undefined);
	},
});
