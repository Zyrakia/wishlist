import { GroupsService } from './services/groups';
import { ReservationsService } from './services/reservations';

export async function cleanReservationsAfterGroupExit(reserverId: string) {
	const reservationsResult = await ReservationsService.listByUserIdWithOwners(reserverId);
	if (reservationsResult.err) throw reservationsResult.val;
	const reservations = reservationsResult.val;

	if (reservations.length === 0) return;

	const ownerIds = Array.from(new Set(reservations.map((v) => v.item.wishlist.userId)));

	const reserverMembershipsResult = await GroupsService.listMembershipsByUserId(reserverId);
	if (reserverMembershipsResult.err) throw reserverMembershipsResult.val;
	const reserverMemberships = reserverMembershipsResult.val;

	const reserverGroups = new Set(reserverMemberships.map((v) => v.groupId));

	const ownerMembershipsResult = await GroupsService.listMembershipsByUserIds(ownerIds);
	if (ownerMembershipsResult.err) throw ownerMembershipsResult.val;
	const ownerMemberships = ownerMembershipsResult.val;

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

	const deleteResult = await ReservationsService.deleteByUserAndItemIds(
		reserverId,
		...invalidReservedItems,
	);
	if (deleteResult.err) throw deleteResult.val;
}
