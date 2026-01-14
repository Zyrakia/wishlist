import { GroupsService } from './services/groups';
import { ReservationsService } from './services/reservations';
import { unwrap } from '$lib/util/safe-call';

export async function cleanReservationsAfterGroupExit(reserverId: string) {
	const reservations = unwrap(await ReservationsService.listByUserWithOwners(reserverId));

	if (reservations.length === 0) return;

	const ownerIds = Array.from(new Set(reservations.map((v) => v.item.wishlist.userId)));

	const reserverMemberships = unwrap(await GroupsService.getMembershipsForUser(reserverId));

	const reserverGroups = new Set(reserverMemberships.map((v) => v.groupId));

	const ownerMemberships = unwrap(await GroupsService.getMembershipsForUsers(ownerIds));

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

	unwrap(await ReservationsService.deleteByUserAndItem(reserverId, ...invalidReservedItems));
}
