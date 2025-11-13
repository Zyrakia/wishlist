import { db } from '$lib/server/db';

import { error } from '@sveltejs/kit';

import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ params, locals }) => {
	const circle = await db().query.CircleTable.findFirst({
		where: (t, { eq }) => eq(t.id, params.circle_id),
		with: { owner: { columns: { id: true, name: true } } },
	});

	if (!circle) error(404);
	return {
		circle,
		isOwn: !!locals.user && locals.user.id === circle.ownerId,
		meta: {
			title: `Circle "${circle.name}"`,
			author: circle.owner.name,
			description: `A wishlist circle created by ${circle.owner.name}.`,
		},
	};
};
