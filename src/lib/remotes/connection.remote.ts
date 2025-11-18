import { command, form, getRequestEvent } from '$app/server';
import { WishlistConnectionSchema } from '$lib/schemas/connection';
import { ItemSchema } from '$lib/schemas/item';
import { db } from '$lib/server/db';
import { WishlistConnectionTable, WishlistItemTable } from '$lib/server/db/schema';
import { generateItemCandidates } from '$lib/server/generation/item-generator';
import { formatRelative } from '$lib/util/date';
import { error, redirect } from '@sveltejs/kit';
import { randomUUID } from 'crypto';
import { count, eq } from 'drizzle-orm';
import ms from 'ms';
import z from 'zod';
import { getWishlist, touchList } from './wishlist.remote';
import { verifyAuth } from '$lib/server/auth';
import { strBoolean } from '$lib/util/zod';

const MIN_SYNC_GAP = ms('1h');

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

		const [{ count: activeConnections }] = await db()
			.select({ count: count() })
			.from(WishlistConnectionTable)
			.where(eq(WishlistConnectionTable.wishlistId, wishlist?.id));

		if (activeConnections >= 5) invalid('Maximum 5 connections allowed');

		await db()
			.insert(WishlistConnectionTable)
			.values({
				id: randomUUID(),
				wishlistId: wishlist.id,
				provider: '' /* TODO infer provider */,
				...data,
			});
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

			tx.delete(WishlistConnectionTable)
				.where(eq(WishlistConnectionTable.id, connectionId))
				.run();
		});

		redirect(303, `/lists/${connection.wishlist.slug}`);
	},
);

export const syncWishlistConnection = command(
	z.object({ connectionId: z.string() }),
	async ({ connectionId }): Promise<{ success: true } | { success: false; error: string }> => {
		const user = verifyAuth();

		const connection = await db().query.WishlistConnectionTable.findFirst({
			where: (t, { eq }) => eq(t.id, connectionId),
			with: { wishlist: { columns: { userId: true } } },
		});

		if (connection?.wishlist.userId !== user.id) error(400, 'Invalid connection');

		const now = new Date();
		if (
			connection.lastSyncedAt &&
			now.getTime() - connection.lastSyncedAt.getTime() < MIN_SYNC_GAP
		) {
			const nextSync = new Date(connection.lastSyncedAt.getTime() + MIN_SYNC_GAP);
			return { success: false, error: `Next sync ${formatRelative(nextSync)}` };
		}

		const { data: candidates, error: generationError } = await generateItemCandidates(
			connection.url,
		);

		if (generationError) return { success: false, error: generationError };

		const items = (candidates || []).flatMap((candidate) => {
			const { success, data } = ItemSchema.safeParse(candidate);
			return success
				? [{ id: randomUUID(), wishlistId: connection.wishlistId, ...data }]
				: [];
		});

		db().transaction((tx) => {
			tx.delete(WishlistItemTable)
				.where(eq(WishlistItemTable.connectionId, connectionId))
				.run();

			tx.insert(WishlistItemTable).values(items).run();

			tx.update(WishlistConnectionTable)
				.set({ lastSyncedAt: now })
				.where(eq(WishlistConnectionTable.id, connectionId))
				.run();
		});

		touchList({ id: connection.wishlistId });
		return { success: true };
	},
);
