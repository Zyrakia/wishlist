import { getGroupInvites, getGroupMembers } from '$lib/remotes/group.remote';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, parent }) => {
	const members = await getGroupMembers({ groupId: params.group_id });

	const pendingInvites = await parent().then(({ group, isOwn }) => {
		if (!isOwn) return [];
		return getGroupInvites({ groupId: group.id });
	});

	return { members, pendingInvites };
};
