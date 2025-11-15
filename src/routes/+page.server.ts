import type { PageServerLoad } from './$types';
import { verifyAuth } from '$lib/server/auth';
import { getCirclesActivity, getMyInvites } from '$lib/remotes/circle.remote';
import { getWishlists } from '$lib/remotes/wishlist.remote';

export const load: PageServerLoad = async () => {
	const user = verifyAuth();

	const [wishlists, circles, invites] = await Promise.all([
		getWishlists(),
		getCirclesActivity(),
		getMyInvites(),
	]);

	return { user, wishlists, circles, invites };
};
