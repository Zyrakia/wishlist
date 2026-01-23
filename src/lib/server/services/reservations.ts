import { and, eq, inArray } from 'drizzle-orm';
import { Err, Ok } from 'ts-results';

import { db } from '../db';
import { ReservationTable } from '../db/schema';
import { createService, DomainError, unwrap } from '../util/service';
import { GroupsService } from './groups';

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

	/**
	 * Asserts that an item is not already reserved.
	 * Returns an error if a reservation exists.
	 *
	 * @param itemId the item ID to check
	 */
	assertNotReserved: async (client, itemId: string) => {
		const reservation = await client.query.ReservationTable.findFirst({
			where: (t, { eq }) => eq(t.itemId, itemId),
		});
		if (reservation) return Err(DomainError.of('Item already reserved'));
		return Ok(undefined);
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

	/**
	 * Cleans up reservations after a user exits a group.
	 * Removes reservations for items where the reserver is no longer
	 * connected to the owner through any shared group.
	 *
	 * @param reserverId the user ID who left the group
	 */
	cleanAfterGroupExit: async (client, reserverId: string) => {
		const reservationsService = ReservationsService.$with(client);
		const groupsService = GroupsService.$with(client);

		const reservations = unwrap(await reservationsService.listByUserIdWithOwners(reserverId));
		if (reservations.length === 0) return Ok(undefined);

		const ownerIds = Array.from(new Set(reservations.map((v) => v.item.wishlist.userId)));

		const reserverMemberships = unwrap(await groupsService.listMembershipsByUserId(reserverId));
		const reserverGroups = new Set(reserverMemberships.map((v) => v.groupId));

		const ownerMemberships = unwrap(await groupsService.listMembershipsByUserIds(ownerIds));

		const connectedOwners = new Set<string>();
		for (const membership of ownerMemberships) {
			if (reserverGroups.has(membership.groupId)) {
				connectedOwners.add(membership.userId);
			}
		}

		const invalidReservedItems = reservations
			.filter((v) => !connectedOwners.has(v.item.wishlist.userId))
			.map((v) => v.itemId);

		if (invalidReservedItems.length === 0) return Ok(undefined);

		unwrap(
			await reservationsService.deleteByUserAndItemIds(reserverId, ...invalidReservedItems),
		);
		return Ok(undefined);
	},
});
