import { db } from '$lib/server/db';

import { error } from '@sveltejs/kit';

import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ params, parent }) => {
	const { wishlist } = await parent();

	const item = await db().query.WishlistItemTable.findFirst({
		where: (t, { and, eq }) => and(eq(t.wishlistId, wishlist.id), eq(t.id, params.item_id)),
	});

	if (!item) error(404);

	return { item, headerBadges: [item.name] };
};
