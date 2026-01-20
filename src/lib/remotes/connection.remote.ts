import { form, getRequestEvent, query } from '$app/server';
import { WishlistConnectionSchema } from '$lib/schemas/connection';
import { verifyAuth } from '$lib/server/auth';
import { syncListConnection } from '$lib/server/generation/connection-sync';
import { ConnectionsService } from '$lib/server/services/connections';
import { cleanBaseName } from '$lib/util/url';
import { strBoolean } from '$lib/util/zod';
import { randomUUID } from 'crypto';
import ms from 'ms';
import z from 'zod';

import { error } from '@sveltejs/kit';

import { getWishlist } from './wishlist.remote';
import { DomainError } from '$lib/server/util/service';

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

		const [existing, totalActive] = await Promise.all([
			ConnectionsService.getByUrl(data.url, wishlist.id),
			ConnectionsService.countByWishlistId(wishlist.id),
		]);

		if (existing.err) throw existing.val;
		if (totalActive.err) throw totalActive.val;
		const existingConnection = existing.val;
		const activeCount = totalActive.val;

		if (existingConnection) invalid('Connection with specified URL already exists');
		if (activeCount >= 5) invalid('Maximum 5 connections allowed');

		const id = randomUUID();
		const createResult = await ConnectionsService.create({
			id: id,
			wishlistId: wishlist.id,
			provider: cleanBaseName(data.url),
			...data,
		});
		if (createResult.err) throw createResult.val;

		syncListConnection(id);
	},
);

export const deleteWishlistConnection = form(
	z.object({ connectionId: z.string(), deleteItems: strBoolean() }),
	async ({ connectionId, deleteItems }) => {
		const user = verifyAuth();
		const connection = await ConnectionsService.getByIdWithWishlist(connectionId);
		if (connection.err) throw connection.val;

		if (!connection.val || connection.val.wishlist.userId !== user.id)
			error(400, 'Invalid connection');

		const deleteResult = await ConnectionsService.deleteById(connectionId, deleteItems);
		if (deleteResult.err) throw deleteResult.val;
	},
);

export const syncWishlistConnection = form(
	z.object({ connectionId: z.string() }),
	async ({ connectionId }, invalid) => {
		const user = verifyAuth();

		const connectionResult = await ConnectionsService.getByIdWithWishlist(connectionId);
		if (connectionResult.err) throw connectionResult.val;
		const connection = connectionResult.val;
		if (connection?.wishlist.userId !== user.id) error(400, 'Invalid connection');

		const result = await syncListConnection(connection.id);
		if (result.ok) return;

		if (DomainError.is(result.val)) invalid(result.val.message);
		else throw result.val;
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

		const recentResult = await ConnectionsService.getRecentSyncsById(
			connectionIds,
			recentCutoff,
		);
		if (recentResult.err) throw recentResult.val;
		return recentResult.val;
	},
);
