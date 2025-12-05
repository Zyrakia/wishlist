import { db } from '$lib/server/db';
import { syncListConnection } from '$lib/server/generation/connection-sync';
import { safePruneParams } from '$lib/util/safe-prune';
import ms from 'ms';
import z from 'zod';

import { error } from '@sveltejs/kit';

import type { LayoutServerLoad } from './$types';
const STALE_THRESHOLD = ms('24h');

const ParamsSchema = z.object({
	sort: z.enum(['alphabetical', 'created', 'price', 'user']).default('user'),
	direction: z.enum(['asc', 'desc']).default('desc'),
});

export const load: LayoutServerLoad = async ({ params, url }) => {
	const searchParams = safePruneParams(ParamsSchema, url.searchParams);

	const wishlist = await db().query.WishlistTable.findFirst({
		where: (t, { eq }) => eq(t.slug, params.wishlist_slug),
		with: {
			items: {
				orderBy: (t, { asc, desc }) => {
					const sortBy = (col: keyof typeof t) =>
						searchParams.direction === 'asc' ? asc(t[col]) : desc(t[col]);

					switch (searchParams.sort) {
						case 'alphabetical':
							return sortBy('name');
						case 'created':
							return sortBy('createdAt');
						case 'price':
							return sortBy('price');
						case 'user':
						default:
							return asc(t.order);
					}
				},
			},
			connections: true,
			user: { columns: { name: true } },
		},
	});

	if (!wishlist) error(404);

	const now = new Date();
	const staleConnectionIds = wishlist.connections
		.filter((v) => {
			if (v.syncError) return false;
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
		sort: searchParams.sort,
		sortDirection: searchParams.direction,
	};
};
