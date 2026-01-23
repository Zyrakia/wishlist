import { getItemForWishlist } from '$lib/remotes/item.remote';

import { error } from '@sveltejs/kit';

import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ params, parent }) => {
	const { wishlist } = await parent();

	const item = await getItemForWishlist({
		wishlistId: wishlist.id,
		itemId: params.item_id,
	});

	if (!item) error(404);

	return { item, listHeaderBadge: [item.name] };
};
