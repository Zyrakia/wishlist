import { and, eq } from 'drizzle-orm';
import { Err, Ok } from 'ts-results';

import { db } from '../db';
import { WishlistTable } from '../db/schema';
import { createService, DomainError } from '../util/service';

type ItemSort = 'alphabetical' | 'created' | 'price' | 'user';
type SortDirection = 'asc' | 'desc';

export const WishlistService = createService(db(), {
	/**
	 * Marks a list as having been updated at the current timestamp.
	 *
	 * @param listId the ID of the list to update
	 */
	touchById: async (client, listId: string) => {
		await client
			.update(WishlistTable)
			.set({ activityAt: new Date() })
			.where(eq(WishlistTable.id, listId));

		return Ok(undefined);
	},

	/**
	 * Fetches a wishlist by slug.
	 *
	 * @param slug the wishlist slug to lookup
	 */
	getBySlug: async (client, slug: string) => {
		const wishlist = await client.query.WishlistTable.findFirst({
			where: (t, { eq }) => eq(t.slug, slug),
		});
		return Ok(wishlist);
	},

	getBySlugOrErr: async (client, slug: string) => {
		const wishlist = await client.query.WishlistTable.findFirst({
			where: (t, { eq }) => eq(t.slug, slug),
		});
		if (!wishlist) return Err(DomainError.of('Wishlist not found'));
		return Ok(wishlist);
	},

	/**
	 * Fetches a wishlist by slug for a specific owner.
	 *
	 * @param slug the wishlist slug to lookup
	 * @param userId the ID of the list owner
	 */
	getBySlugForOwner: async (client, slug: string, userId: string) => {
		const wishlist = await client.query.WishlistTable.findFirst({
			where: (t, { and, eq }) => and(eq(t.userId, userId), eq(t.slug, slug)),
		});
		return Ok(wishlist);
	},

	getBySlugForOwnerOrErr: async (client, slug: string, userId: string) => {
		const wishlist = await client.query.WishlistTable.findFirst({
			where: (t, { and, eq }) => and(eq(t.userId, userId), eq(t.slug, slug)),
		});
		if (!wishlist) return Err(DomainError.of('Wishlist not found for owner'));
		return Ok(wishlist);
	},

	/**
	 * Fetches a wishlist by slug when not owned by a specific user.
	 *
	 * @param slug the wishlist slug to lookup
	 * @param userId the ID to exclude from ownership
	 */
	getBySlugForNonOwner: async (client, slug: string, userId: string) => {
		const wishlist = await client.query.WishlistTable.findFirst({
			where: (t, { and, eq, ne }) => and(eq(t.slug, slug), ne(t.userId, userId)),
			columns: { id: true, userId: true },
		});
		return Ok(wishlist);
	},

	getBySlugForNonOwnerOrErr: async (client, slug: string, userId: string) => {
		const wishlist = await client.query.WishlistTable.findFirst({
			where: (t, { and, eq, ne }) => and(eq(t.slug, slug), ne(t.userId, userId)),
			columns: { id: true, userId: true },
		});
		if (!wishlist) return Err(DomainError.of('Wishlist not found'));
		return Ok(wishlist);
	},

	/**
	 * Fetches a wishlist by slug and ID for an owner.
	 *
	 * @param slug the wishlist slug to lookup
	 * @param listId the wishlist ID to lookup
	 * @param userId the ID of the list owner
	 */
	getBySlugAndIdForOwner: async (client, slug: string, listId: string, userId: string) => {
		const wishlist = await client.query.WishlistTable.findFirst({
			where: (t, { and, eq }) =>
				and(eq(t.userId, userId), eq(t.id, listId), eq(t.slug, slug)),
		});
		return Ok(wishlist);
	},

	getBySlugAndIdForOwnerOrErr: async (
		client,
		slug: string,
		listId: string,
		userId: string,
	) => {
		const wishlist = await client.query.WishlistTable.findFirst({
			where: (t, { and, eq }) =>
				and(eq(t.userId, userId), eq(t.id, listId), eq(t.slug, slug)),
		});
		if (!wishlist) return Err(DomainError.of('Wishlist ID invalid'));
		return Ok(wishlist);
	},

	/**
	 * Fetches a wishlist with related items, connections, and user.
	 *
	 * @param slug the wishlist slug to lookup
	 * @param sort the item sorting mode
	 * @param direction the item sorting direction
	 */
	getBySlugWithItems: async (
		client,
		slug: string,
		sort: ItemSort,
		direction: SortDirection,
	) => {
		const wishlist = await client.query.WishlistTable.findFirst({
			where: (t, { eq }) => eq(t.slug, slug),
			with: {
				items: {
					orderBy: (t, { asc, desc }) => {
						const sortBy = (col: keyof typeof t) =>
							direction === 'asc' ? asc(t[col]) : desc(t[col]);

						switch (sort) {
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
		return Ok(wishlist);
	},

	getBySlugWithItemsOrErr: async (
		client,
		slug: string,
		sort: ItemSort,
		direction: SortDirection,
	) => {
		const wishlist = await client.query.WishlistTable.findFirst({
			where: (t, { eq }) => eq(t.slug, slug),
			with: {
				items: {
					orderBy: (t, { asc, desc }) => {
						const sortBy = (col: keyof typeof t) =>
							direction === 'asc' ? asc(t[col]) : desc(t[col]);

						switch (sort) {
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
		if (!wishlist) return Err(DomainError.of('Wishlist not found'));
		return Ok(wishlist);
	},

	/**
	 * Creates a wishlist record.
	 *
	 * @param data the wishlist data to insert
	 */
	create: async (client, data: typeof WishlistTable.$inferInsert) => {
		await client.insert(WishlistTable).values(data);
		return Ok(undefined);
	},

	createWithSlugCheck: async (client, data: typeof WishlistTable.$inferInsert) => {
		const existing = await client.query.WishlistTable.findFirst({
			where: (t, { eq }) => eq(t.slug, data.slug),
		});
		if (existing) return Err(DomainError.of('Slug is taken'));

		await client.insert(WishlistTable).values(data);
		return Ok(undefined);
	},

	/**
	 * Updates a wishlist for a specific owner and slug.
	 *
	 * @param slug the wishlist slug to update
	 * @param userId the ID of the list owner
	 * @param data the fields to update
	 */
	updateBySlugForOwner: async (
		client,
		slug: string,
		userId: string,
		data: Partial<typeof WishlistTable.$inferInsert>,
	) => {
		const rows = await client
			.update(WishlistTable)
			.set({ ...data })
			.where(and(eq(WishlistTable.slug, slug), eq(WishlistTable.userId, userId)))
			.returning();

		return Ok(rows);
	},

	updateBySlugForOwnerChecked: async (
		client,
		slug: string,
		userId: string,
		data: Partial<typeof WishlistTable.$inferInsert>,
	) => {
		if (data.slug !== undefined && data.slug !== slug) {
			const existing = await client.query.WishlistTable.findFirst({
				where: (t, { eq }) => eq(t.slug, data.slug!),
			});
			if (existing) return Err(DomainError.of('Slug is taken'));
		}

		const rows = await client
			.update(WishlistTable)
			.set({ ...data })
			.where(and(eq(WishlistTable.slug, slug), eq(WishlistTable.userId, userId)))
			.returning();

		return Ok(rows);
	},

	/**
	 * Deletes a wishlist by ID.
	 *
	 * @param listId the ID of the wishlist to delete
	 */
	deleteById: async (client, listId: string) => {
		await client.delete(WishlistTable).where(eq(WishlistTable.id, listId));
		return Ok(undefined);
	},

	/**
	 * Lists wishlists for a given user.
	 *
	 * @param userId the ID of the user to lookup
	 */
	listForOwner: async (client, userId: string) => {
		const wishlists = await client.query.WishlistTable.findMany({
			where: (t, { eq }) => eq(t.userId, userId),
			orderBy: (t, { desc }) => desc(t.activityAt),
		});

		return Ok(wishlists);
	},
});
