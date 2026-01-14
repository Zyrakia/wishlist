import { and, asc, desc, eq, ne } from 'drizzle-orm';
import { db } from '../db';
import { WishlistTable } from '../db/schema';
import { createClientService } from '../util/client-service';

type ItemSort = 'alphabetical' | 'created' | 'price' | 'user';
type SortDirection = 'asc' | 'desc';

export const WishlistService = createClientService(db(), {
	/**
	 * Marks a list as having been updated at the current timestamp.
	 *
	 * @param listId the ID of the list to update
	 */
	touchList: async (client, listId: string) => {
		await client
			.update(WishlistTable)
			.set({ activityAt: new Date() })
			.where(eq(WishlistTable.id, listId));
	},

	/**
	 * Fetches a wishlist by slug.
	 *
	 * @param slug the wishlist slug to lookup
	 */
	getBySlug: async (client, slug: string) => {
		return await client.query.WishlistTable.findFirst({
			where: (t, { eq }) => eq(t.slug, slug),
		});
	},

	/**
	 * Fetches a wishlist by slug for a specific owner.
	 *
	 * @param slug the wishlist slug to lookup
	 * @param userId the ID of the list owner
	 */
	getBySlugForUser: async (client, slug: string, userId: string) => {
		return await client.query.WishlistTable.findFirst({
			where: (t, { and, eq }) => and(eq(t.userId, userId), eq(t.slug, slug)),
		});
	},

	/**
	 * Fetches a wishlist by slug when not owned by a specific user.
	 *
	 * @param slug the wishlist slug to lookup
	 * @param userId the ID to exclude from ownership
	 */
	getBySlugNotOwned: async (client, slug: string, userId: string) => {
		return await client.query.WishlistTable.findFirst({
			where: (t, { and, eq, ne }) => and(eq(t.slug, slug), ne(t.userId, userId)),
			columns: { id: true, userId: true },
		});
	},

	/**
	 * Fetches a wishlist by slug and ID for an owner.
	 *
	 * @param slug the wishlist slug to lookup
	 * @param listId the wishlist ID to lookup
	 * @param userId the ID of the list owner
	 */
	getBySlugAndIdForUser: async (client, slug: string, listId: string, userId: string) => {
		return await client.query.WishlistTable.findFirst({
			where: (t, { and, eq }) =>
				and(eq(t.userId, userId), eq(t.id, listId), eq(t.slug, slug)),
		});
	},

	/**
	 * Fetches a wishlist with related items, connections, and user.
	 *
	 * @param slug the wishlist slug to lookup
	 * @param sort the item sorting mode
	 * @param direction the item sorting direction
	 */
	getWithItems: async (client, slug: string, sort: ItemSort, direction: SortDirection) => {
		return await client.query.WishlistTable.findFirst({
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
	},

	/**
	 * Creates a wishlist record.
	 *
	 * @param data the wishlist data to insert
	 */
	createWishlist: async (client, data: typeof WishlistTable.$inferInsert) => {
		await client.insert(WishlistTable).values(data);
	},

	/**
	 * Updates a wishlist for a specific owner and slug.
	 *
	 * @param slug the wishlist slug to update
	 * @param userId the ID of the list owner
	 * @param data the fields to update
	 */
	updateBySlugForUser: async (
		client,
		slug: string,
		userId: string,
		data: Partial<typeof WishlistTable.$inferInsert>,
	) => {
		return await client
			.update(WishlistTable)
			.set({ ...data })
			.where(and(eq(WishlistTable.slug, slug), eq(WishlistTable.userId, userId)))
			.returning();
	},

	/**
	 * Deletes a wishlist by ID.
	 *
	 * @param listId the ID of the wishlist to delete
	 */
	deleteById: async (client, listId: string) => {
		await client.delete(WishlistTable).where(eq(WishlistTable.id, listId));
	},

	/**
	 * Lists wishlists for a given user.
	 *
	 * @param userId the ID of the user to lookup
	 */
	listByUserId: async (client, userId: string) => {
		return await client.query.WishlistTable.findMany({
			where: (t, { eq }) => eq(t.userId, userId),
			orderBy: (t, { desc }) => desc(t.activityAt),
		});
	},
});
