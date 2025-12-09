import { form, getRequestEvent, query } from '$app/server';
import { verifyAuth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { error, redirect } from '@sveltejs/kit';
import z from 'zod';
import { getMe, resolveMe } from './auth.remote';
import { and, eq } from 'drizzle-orm';
import { ReservationTable } from '$lib/server/db/schema';

const sharesGroup = async (viewerId: string, ownerId: string) => {
	if (viewerId === ownerId) return false;

	const [viewerGroups, ownerGroups] = await Promise.all([
		db().query.GroupMembershipTable.findMany({
			where: (t, { eq }) => eq(t.userId, viewerId),
			columns: { groupId: true },
		}),
		db().query.GroupMembershipTable.findMany({
			where: (t, { eq }) => eq(t.userId, ownerId),
			columns: { groupId: true },
		}),
	]);

	const viewGroupIds = new Set(viewerGroups.map((v) => v.groupId));
	return ownerGroups.some((v) => viewGroupIds.has(v.groupId));
};

export const reserveItem = form(z.object({ itemId: z.string() }), async ({ itemId }) => {
	const {
		params: { wishlist_slug },
	} = getRequestEvent();
	if (!wishlist_slug) error(400, 'A wishlist slug is required while reserving an item');

	const viewer = await resolveMe({});
	const wl = await db().query.WishlistTable.findFirst({
		where: (t, { eq, ne, and }) => and(eq(t.slug, wishlist_slug), ne(t.userId, viewer.id)),
		columns: { id: true, userId: true },
	});

	if (!wl) error(400, 'Invalid wishlist slug provided');

	const item = await db().query.WishlistItemTable.findFirst({
		where: (t, { eq, and }) => and(eq(t.id, itemId), eq(t.wishlistId, wl.id)),
	});

	if (!item) error(400, 'Invalid item ID provided');

	const existingReservation = await db().query.ReservationTable.findFirst({
		where: (t, { eq }) => eq(t.itemId, itemId),
	});

	if (existingReservation) error(400, 'This item is already reserved');

	if (!(await sharesGroup(viewer.id, wl.userId)))
		error(401, 'You cannot reserve items on this list');

	await db().insert(ReservationTable).values({
		itemId: itemId,
		userId: viewer.id,
		wishlistId: wl.id,
	});
});

export const removeReservation = form(z.object({ itemId: z.string() }), async ({ itemId }) => {
	const viewer = verifyAuth();
	await db()
		.delete(ReservationTable)
		.where(and(eq(ReservationTable.userId, viewer.id), eq(ReservationTable.itemId, itemId)));
});

export const getReservations = query(async () => {
	const {
		params: { wishlist_slug },
		locals,
	} = getRequestEvent();
	if (!wishlist_slug) error(400, 'A wishlist slug is required while retrieving reservations');

	const viewer = locals.user;
	if (!viewer) return;

	const wl = await db().query.WishlistTable.findFirst({
		where: (t, { eq, ne, and }) => and(eq(t.slug, wishlist_slug), ne(t.userId, viewer.id)),
		columns: { id: true, userId: true },
	});

	if (!wl) return;
	if (!(await sharesGroup(viewer.id, wl.userId))) return;

	return await db().query.ReservationTable.findMany({
		where: (t, { eq }) => eq(t.wishlistId, wl.id),
	});
});
