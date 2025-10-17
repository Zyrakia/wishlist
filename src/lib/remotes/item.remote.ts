import { form, getRequestEvent } from '$app/server';
import { createInsertSchema } from 'drizzle-zod';
import { WishlistItemTable } from '../server/db/schema';
import z from 'zod';
import { db } from '../server/db';
import { error, redirect } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';

const ItemSchema = createInsertSchema(WishlistItemTable, {
	name: (v) => v.nonempty().transform((v) => v.trim()),
	notes: (v) => v.transform((v) => v.trim()),
	imageUrl: z
		.string()
		.optional()
		.transform((v) => v?.trim()),
	url: z
		.string()
		.optional()
		.transform((v) => v?.trim()),
	priceCurrency: z
		.string()
		.optional()
		.transform((v) => v?.trim()),
	price: z
		.string()
		.or(z.number())
		.optional()
		.transform((v, ctx) => {
			if (v === undefined) return;

			const n = Number(v);
			if (!isNaN(n)) return n;

			ctx.addIssue({ code: 'custom', message: 'Not a number', input: v });
			return z.NEVER;
		}),
}).omit({
	id: true,
	createdAt: true,
	wishlistId: true,
});

export const createItem = form(ItemSchema, async (data) => {
	const {
		params: { wishlist_slug },
		locals: { user },
	} = getRequestEvent();

	if (!user) error(401);
	if (!wishlist_slug) error(400, 'A wishlist slug is required while creating an item');

	const wl = await db.query.WishlistTable.findFirst({
		where: (t, { and, eq }) => and(eq(t.userId, user.id), eq(t.slug, wishlist_slug)),
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
