import { db } from '$lib/server/db';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const wishlist = await db.query.WishlistTable.findFirst({
		where: (t, { eq }) => eq(t.slug, params.wishlist_slug),
		with: { items: true, user: { columns: { name: true } } },
	});

	if (!wishlist) error(404);

	return { wishlist };
};
