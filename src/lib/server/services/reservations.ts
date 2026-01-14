import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../db';
import { ReservationTable } from '../db/schema';
import { createClientService } from '../util/client-service';

export const ReservationsService = createClientService(db(), {
	/**
	 * Lists reservations for a user with related wishlist owners.
	 *
	 * @param userId the user ID to lookup
	 */
	listByUserWithOwners: async (client, userId: string) => {
		return await client.query.ReservationTable.findMany({
			where: (t, { eq }) => eq(t.userId, userId),
			with: {
				item: {
					columns: { id: true },
					with: { wishlist: { columns: { userId: true } } },
				},
			},
		});
	},

	/**
	 * Lists reservations for a wishlist.
	 *
	 * @param wishlistId the wishlist ID to scope by
	 */
	listByWishlistId: async (client, wishlistId: string) => {
		return await client.query.ReservationTable.findMany({
			where: (t, { eq }) => eq(t.wishlistId, wishlistId),
		});
	},

	/**
	 * Fetches a reservation by item ID.
	 *
	 * @param itemId the item ID to lookup
	 */
	getByItemId: async (client, itemId: string) => {
		return await client.query.ReservationTable.findFirst({
			where: (t, { eq }) => eq(t.itemId, itemId),
		});
	},

	/**
	 * Creates a reservation record.
	 *
	 * @param data the reservation data to insert
	 */
	createReservation: async (client, data: typeof ReservationTable.$inferInsert) => {
		await client.insert(ReservationTable).values(data);
	},

	/**
	 * Deletes a reservation for a user and item.
	 *
	 * @param userId the user ID to scope by
	 * @param itemId the item ID to scope by, can be multiple
	 */
	deleteByUserAndItem: async (client, userId: string, ...itemId: string[]) => {
		const itemSelector =
			itemId.length === 1
				? eq(ReservationTable.itemId, itemId[0])
				: inArray(ReservationTable.itemId, itemId);

		await client
			.delete(ReservationTable)
			.where(and(eq(ReservationTable.userId, userId), itemSelector));
	},
});
