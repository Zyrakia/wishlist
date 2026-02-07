import type { PageServerLoad } from './$types';
import { getGroupActivity, getMyInvites } from '$lib/remotes/group.remote';
import { getWishlists } from '$lib/remotes/wishlist.remote';
import { verifyAuth } from '$lib/server/auth';

export const load: PageServerLoad = async () => {
	const user = verifyAuth({ failStrategy: 'welcome' });

	const [wishlists, groups, invites] = await Promise.all([
		getWishlists(),
		getGroupActivity(),
		getMyInvites(),
	]);

	return { user, wishlists, groups, invites };
};
