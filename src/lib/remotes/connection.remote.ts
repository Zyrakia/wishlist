import { form, getRequestEvent, query } from '$app/server';
import { WishlistConnectionSchema } from '$lib/schemas/connection';
import { db } from '$lib/server/db';
import {
	GeolocationTable,
	WishlistConnectionTable,
	WishlistItemTable,
} from '$lib/server/db/schema';
import { error, isHttpError, redirect } from '@sveltejs/kit';
import { randomUUID } from 'crypto';
import { count, eq, sql } from 'drizzle-orm';
import z from 'zod';
import { getWishlist } from './wishlist.remote';
import { verifyAuth } from '$lib/server/auth';
import { strBoolean } from '$lib/util/zod';
import { cleanBaseName } from '$lib/util/url';
import { syncListConnection } from '$lib/server/generation/connection-sync';
import ms from 'ms';
import { requestGeolocation } from '$lib/server/util/geolocation';
import { getRequestAddress } from '$lib/server/util/request';

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

		const existingQuery = await db().query.WishlistConnectionTable.findFirst({
			where: (t, { and, eq }) =>
				and(
					eq(sql<string>`LOWER(${t.url})`, data.url.toLowerCase()),
					eq(t.wishlistId, wishlist.id),
				),
		});

		const countQuery = await db()
			.select({ count: count() })
			.from(WishlistConnectionTable)
			.where(eq(WishlistConnectionTable.wishlistId, wishlist?.id));

		const [existing, [{ count: activeConnections }]] = await Promise.all([
			existingQuery,
			countQuery,
		]);

		if (existing) invalid('Connection with specified URL already exists');
		if (activeConnections >= 5) invalid('Maximum 5 connections allowed');

		const geo = await requestGeolocation(getRequestAddress(getRequestEvent()));
		const createdGeoId = geo ? randomUUID() : undefined;
		if (geo && createdGeoId) {
			await db()
				.insert(GeolocationTable)
				.values({
					id: createdGeoId,
					...geo,
				});
		}

		const id = randomUUID();
		await db()
			.insert(WishlistConnectionTable)
			.values({
				id: id,
				wishlistId: wishlist.id,
				provider: cleanBaseName(new URL(data.url)),
				createdGeoId: createdGeoId,
				...data,
			});

		syncListConnection(id);
	},
);

export const deleteWishlistConnection = form(
	z.object({ connectionId: z.string(), deleteItems: strBoolean() }),
	async ({ connectionId, deleteItems }) => {
		const user = verifyAuth();
		const connection = await db().query.WishlistConnectionTable.findFirst({
			where: (t, { eq }) => eq(t.id, connectionId),
			with: { wishlist: { columns: { userId: true, slug: true } } },
		});

		if (!connection || connection.wishlist.userId !== user.id) error(400, 'Invalid connection');

		db().transaction((tx) => {
			if (deleteItems) {
				tx.delete(WishlistItemTable)
					.where(eq(WishlistItemTable.connectionId, connectionId))
					.run();
			}

			if (connection.createdGeoId) {
				tx.delete(GeolocationTable)
					.where(eq(GeolocationTable.id, connection.createdGeoId))
					.run();
			}

			tx.delete(WishlistConnectionTable)
				.where(eq(WishlistConnectionTable.id, connectionId))
				.run();
		});
	},
);

export const syncWishlistConnection = form(
	z.object({ connectionId: z.string() }),
	async ({ connectionId }, invalid) => {
		const user = verifyAuth();

		const connection = await db().query.WishlistConnectionTable.findFirst({
			where: (t, { eq }) => eq(t.id, connectionId),
			with: { wishlist: { columns: { userId: true } } },
		});

		if (connection?.wishlist.userId !== user.id) error(400, 'Invalid connection');

		const { success, error: syncError } = await syncListConnection(connection.id);
		if (!success) {
			if (typeof syncError === 'string') invalid(syncError);
			else throw syncError;
		}
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

		const recentSynced = await db().query.WishlistConnectionTable.findMany({
			where: (t, { and, inArray, gte, or }) =>
				and(
					inArray(t.id, connectionIds),
					or(gte(t.lastSyncedAt, recentCutoff), eq(t.syncError, true)),
				),
			columns: { id: true, lastSyncedAt: true, syncError: true },
		});

		return recentSynced;
	},
);
