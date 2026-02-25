import { UsersService } from '$lib/server/services/users';
import { WishlistService } from '$lib/server/services/wishlist';
import { unwrap } from '$lib/server/util/service';
import { error, redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { z } from 'zod';
import { safePruneParams } from '$lib/util/safe-prune.js';
import { UrlBuilder } from '$lib/util/url.js';

const ParamsSchema = z.object({
	fast: z.literal(['1', 'yes', 'true']).transform(() => true),
});

export const load: LayoutServerLoad = async ({ params, url }) => {
	const user = unwrap(await UsersService.getById(params.user_id));
	if (!user) error(404, 'User not found');

	const searchParams = safePruneParams(ParamsSchema, url.searchParams);

	const [wishlists, fullUser] = await Promise.all([
		WishlistService.listsForOwner(user.id),
		UsersService.getPublicById(user.id),
	]);

	const publicUser = unwrap(fullUser);
	if (!publicUser) error(404, 'User not found');

	const lists = unwrap(wishlists);
	if (searchParams.fast === true && lists.length === 1) {
		redirect(303, UrlBuilder.from('/lists').segment(lists[0].slug).toPath());
	}

	return {
		user: publicUser,
		wishlists: lists,
		meta: {
			title: `${user.name} | Wishii`,
			description: `Browse ${user.name}'s most recent wishlists.`,
		},
	};
};
