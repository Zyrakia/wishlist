import { verifyAuth } from '$lib/server/auth';
import { db } from '$lib/server/db';

import { error } from '@sveltejs/kit';

import type { LayoutServerLoad } from './$types';
export const load: LayoutServerLoad = async ({ params, locals }) => {
	verifyAuth();

	const group = await db().query.GroupTable.findFirst({
		where: (t, { eq }) => eq(t.id, params.group_id),
		with: { owner: { columns: { id: true, name: true } } },
	});

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
