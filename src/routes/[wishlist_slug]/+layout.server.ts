import { db } from '$lib/server/db';
import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ params }) => {
	const wishlist = await db.query.WishlistTable.findFirst({
		where: (t, { eq }) => eq(t.slug, params.wishlist_slug),
		with: { items: true, user: { columns: { name: true } } },
	});

	if (!wishlist) error(404);

	return { wishlist };
};
