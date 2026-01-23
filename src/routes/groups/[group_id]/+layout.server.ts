import { getGroupById } from '$lib/remotes/group.remote';
import { verifyAuth } from '$lib/server/auth';

import { error } from '@sveltejs/kit';

import type { LayoutServerLoad } from './$types';
export const load: LayoutServerLoad = async ({ params, locals }) => {
	verifyAuth();

	const group = await getGroupById({ groupId: params.group_id });

	if (!group) error(404);
	return {
		group,
		isOwn: !!locals.user && locals.user.id === group.ownerId,
		meta: {
			title: `Group "${group.name}"`,
			author: group.owner.name,
			description: `A wishlist group created by ${group.owner.name}.`,
		},
	};
};
