import { and, eq, inArray } from 'drizzle-orm';
import { db } from './db';
import { ReservationTable } from './db/schema';

export async function cleanReservationsAfterGroupExit(reserverId: string) {
	const reservations = await db().query.ReservationTable.findMany({
		where: (t, { eq }) => eq(t.userId, reserverId),
		with: {
			item: {
				columns: { id: true },
				with: { wishlist: { columns: { userId: true } } },
			},
		},
	});

	if (reservations.length === 0) return;

	const ownerIds = Array.from(new Set(reservations.map((v) => v.item.wishlist.userId)));

	const reserverMemberships = await db().query.GroupMembershipTable.findMany({
		where: (t, { eq }) => eq(t.userId, reserverId),
		columns: { groupId: true },
	});

	const reserverGroups = new Set(reserverMemberships.map((v) => v.groupId));

	const ownerMemberships = await db().query.GroupMembershipTable.findMany({
		where: (t, { inArray }) => inArray(t.userId, ownerIds),
		columns: { userId: true, groupId: true },
	});

	const connectedOwners = new Set<string>();
	for (const membership of ownerMemberships) {
		if (reserverGroups.has(membership.groupId)) {
			connectedOwners.add(membership.userId);
		}
	}

	const invalidReservedItems = reservations
		.filter((v) => !connectedOwners.has(v.item.wishlist.userId))
		.map((v) => v.itemId);

	if (invalidReservedItems.length === 0) return;

	await db()
		.delete(ReservationTable)
		.where(
			and(
				eq(ReservationTable.userId, reserverId),
				inArray(ReservationTable.itemId, invalidReservedItems),
			),
		);
}
