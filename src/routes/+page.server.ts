import type { PageServerLoad } from './$types';
import { getCirclesActivity, getMyInvites } from '$lib/remotes/circle.remote';
import { getWishlists } from '$lib/remotes/wishlist.remote';
import { verifyAuth } from '$lib/server/auth';

export const load: PageServerLoad = async () => {
	const user = verifyAuth();

	const loadData = await Promise.all([getWishlists(), getCirclesActivity(), getMyInvites()]);
	return { user, wishlists: loadData[0], circles: loadData[1], invites: loadData[2] };
};
