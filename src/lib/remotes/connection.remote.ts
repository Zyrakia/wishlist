import { form, getRequestEvent, query } from '$app/server';
import { WishlistConnectionSchema } from '$lib/schemas/connection';
import { verifyAuth } from '$lib/server/auth';
import { syncListConnection } from '$lib/server/generation/connection-sync';
import { ConnectionsService } from '$lib/server/services/connections';
import { unwrap, unwrapOrDomain } from '$lib/server/util/service';
import { cleanBaseName } from '$lib/util/url';
import { strBoolean } from '$lib/util/zod';
import { randomUUID } from 'crypto';
import ms from 'ms';
import z from 'zod';

import { error } from '@sveltejs/kit';

import { getWishlist } from './wishlist.remote';

export const createWishlistConnection = form(
	WishlistConnectionSchema.extend({
		provider: WishlistConnectionSchema.shape.provider.optional(),
	}),
	async (data, invalid) => {
		const {
			params: { wishlist_slug },
		} = getRequestEvent();
		if (!wishlist_slug) error(400, 'Cannot create connection without wishlist');

		const user = verifyAuth();
		const wishlist = await getWishlist({ slug: wishlist_slug });
		if (!wishlist || wishlist.userId !== user.id)
			return error(400, 'Cannot create connection without wishlist');

		const [existingConnection, activeCount] = await Promise.all([
			ConnectionsService.getByUrl(data.url, wishlist.id).then(unwrap),
			ConnectionsService.countByWishlistId(wishlist.id).then(unwrap),
		]);

		if (existingConnection) invalid('Connection with specified URL already exists');
		if (activeCount >= 5) invalid('Maximum 5 connections allowed');

		const id = randomUUID();
		unwrap(
			await ConnectionsService.create({
				id: id,
				wishlistId: wishlist.id,
				provider: cleanBaseName(data.url),
				...data,
			}),
		);

		syncListConnection(id);
	},
);

export const deleteWishlistConnection = form(
	z.object({ connectionId: z.string(), deleteItems: strBoolean() }),
	async ({ connectionId, deleteItems }) => {
		const user = verifyAuth();
		const connection = unwrap(await ConnectionsService.getByIdWithWishlist(connectionId));

		if (!connection || connection.wishlist.userId !== user.id) error(400, 'Invalid connection');

		unwrap(await ConnectionsService.deleteById(connectionId, deleteItems));
	},
);

export const syncWishlistConnection = form(
	z.object({ connectionId: z.string() }),
	async ({ connectionId }, invalid) => {
		const user = verifyAuth();

		const connection = unwrap(await ConnectionsService.getByIdWithWishlist(connectionId));
		if (connection?.wishlist.userId !== user.id) error(400, 'Invalid connection');

		unwrapOrDomain(await syncListConnection(connection.id), invalid);
	},
);

export const checkSyncStatus = query(
	z.object({
		connectionIds: z.array(z.string()),
		recentThresholdMs: z.number().default(ms('1m')),
	}),
	async ({ connectionIds, recentThresholdMs }) => {
		if (!connectionIds.length) return [];
		const recentCutoff = new Date(Date.now() - recentThresholdMs);

		return unwrap(await ConnectionsService.getRecentSyncsById(connectionIds, recentCutoff));
	},
);
