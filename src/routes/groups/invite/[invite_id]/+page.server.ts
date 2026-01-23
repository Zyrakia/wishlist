import { resolveMySession } from '$lib/remotes/auth.remote';
import { getGroupInvite } from '$lib/remotes/group.remote';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const invite = await getGroupInvite({ inviteId: params.invite_id });

	const me = await resolveMySession();
	return { invite, me };
};
