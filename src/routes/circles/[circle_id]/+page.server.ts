import { db } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const members = await db().query.CircleMembershipTable.findMany({
		where: (t, { eq }) => eq(t.circleId, params.circle_id),
		with: {
			user: {
				columns: { id: true, name: true },
				with: {
					wishlists: {
						orderBy: (t, { desc }) => desc(t.activityAt),
						limit: 5,
					},
				},
			},
		},
	});

	return { members };
};
