import { db } from '$lib/server/db';

import { error } from '@sveltejs/kit';

import type { LayoutServerLoad } from './$types';
import ms from 'ms';
import { syncListConnection } from '$lib/server/generation/connection-sync';

const STALE_THRESHOLD = ms('24h');

export const load: LayoutServerLoad = async ({ params }) => {
	const wishlist = await db().query.WishlistTable.findFirst({
		where: (t, { eq }) => eq(t.slug, params.wishlist_slug),
		with: { items: true, connections: true, user: { columns: { name: true } } },
	});

	if (!wishlist) error(404);

	const now = new Date();
	const staleConnectionIds = wishlist.connections
		.filter((v) => {
			if (!v.lastSyncedAt) return true;
			return now.getTime() - v.lastSyncedAt.getTime() > STALE_THRESHOLD;
		})
		.map((v) => v.id);

	staleConnectionIds.forEach((v) => syncListConnection(v));

	return {
		wishlist,
		syncingConnectionIds: staleConnectionIds,
		meta: {
			title: `${wishlist.name} by ${wishlist.user.name}`,
			description:
				wishlist.description || `Check out this wishlist by ${wishlist.user.name}!`,
			author: wishlist.user.name,
		},
	};
};
