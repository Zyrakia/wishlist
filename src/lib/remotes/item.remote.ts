import { form, getRequestEvent } from '$app/server';
import { WishlistItemTable } from '../server/db/schema';
import { db } from '../server/db';
import { error, redirect } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { ItemSchema } from '$lib/schema/item';

export const createItem = form(ItemSchema, async (data) => {
	const {
		params: { wishlist_slug },
		locals: { user },
	} = getRequestEvent();

	// if (!user) error(401);
	if (!wishlist_slug) error(400, 'A wishlist slug is required while creating an item');

	const wl = await db.query.WishlistTable.findFirst({
		where: (t, { and, eq }) => and(/* eq(t.userId, user.id), */ eq(t.slug, wishlist_slug)),
	});

	if (!wl) error(400, 'Invalid wishlist slug provided');

	await db.insert(WishlistItemTable).values({
		id: randomUUID(),
		wishlistId: wl.id,
		createdAt: new Date(),
		...data,
	});

	redirect(303, `/${wishlist_slug}`);
});

export const updateItem = form(ItemSchema.partial(), async (data) => {
	const {
		params: { wishlist_slug, item_id },
		locals: { user },
	} = getRequestEvent();

	if (!user) error(401);
	if (!wishlist_slug || !item_id)
		error(400, 'A wishlist slug and item ID is required while updating an item');

	const wl = await db.query.WishlistTable.findFirst({
		where: (t, { and, eq }) => and(eq(t.userId, user.id), eq(t.slug, wishlist_slug)),
	});

	if (!wl) error(400, 'Invalid wishlist slug provided');

	await db
		.update(WishlistItemTable)
		.set({ ...data })
		.where(and(eq(WishlistItemTable.id, item_id), eq(WishlistItemTable.wishlistId, wl.id)));

	redirect(303, `/${wishlist_slug}`);
});

export const deleteItem = form(async () => {
	const {
		params: { wishlist_slug, item_id },
		locals: { user },
	} = getRequestEvent();

	if (!user) error(401);
	if (!wishlist_slug || !item_id)
		error(400, 'A wishlist slug and item ID is required while deleting an item');

	const wl = await db.query.WishlistTable.findFirst({
		where: (t, { and, eq }) => and(eq(t.userId, user.id), eq(t.slug, wishlist_slug)),
	});

	if (!wl) error(400, 'Invalid wishlist slug provided');

	await db
		.delete(WishlistItemTable)
		.where(and(eq(WishlistItemTable.id, item_id), eq(WishlistItemTable.wishlistId, wl.id)));
});
