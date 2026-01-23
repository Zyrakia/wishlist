import { safePruneParams } from '$lib/util/safe-prune';
import ms from 'ms';
import z from 'zod';

import { error } from '@sveltejs/kit';

import type { LayoutServerLoad } from './$types';
import { getReservations } from '$lib/remotes/reservation.remote';
import { getWishlistWithItems } from '$lib/remotes/wishlist.remote';
import { SyncService } from '$lib/server/services/sync';
const STALE_THRESHOLD = ms('24h');

const ParamsSchema = z.object({
	sort: z.enum(['alphabetical', 'created', 'price', 'user']).default('user'),
	direction: z.enum(['asc', 'desc']).default('desc'),
});

export const load: LayoutServerLoad = async ({ params, url }) => {
	const searchParams = safePruneParams(ParamsSchema, url.searchParams);

	const [wishlist, reservations] = await Promise.all([
		getWishlistWithItems({
			slug: params.wishlist_slug,
			sort: searchParams.sort ?? 'user',
			direction: searchParams.direction ?? 'desc',
		}),
		getReservations(),
	]);

	if (!wishlist) error(404);

	const now = new Date();
	const staleConnectionIds = wishlist.connections
		.filter((v) => {
			if (v.syncError) return false;
			if (!v.lastSyncedAt) return true;
			return now.getTime() - v.lastSyncedAt.getTime() > STALE_THRESHOLD;
		})
		.map((v) => v.id);

	staleConnectionIds.forEach((v) => SyncService.syncConnection(v));

	return {
		wishlist,
		reservations: reservations || [],
		canAccessReservations: reservations !== undefined,
		syncingConnectionIds: staleConnectionIds,
		meta: {
			title: `${wishlist.name} by ${wishlist.user.name}`,
			description:
				wishlist.description || `Check out this wishlist by ${wishlist.user.name}!`,
			author: wishlist.user.name,
		},
		sort: searchParams.sort,
		sortDirection: searchParams.direction,
	};
};
