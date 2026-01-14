import type { PageServerLoad } from './$types';
import { getOwnedGroup } from '$lib/remotes/group.remote';

export const load: PageServerLoad = async () => {
	const ownedGroup = await getOwnedGroup();
	return { ownedGroup };
};
