import { db } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, parent }) => {
	const members = await db().query.CircleMembershipTable.findMany({
		where: (t, { eq }) => eq(t.circleId, params.circle_id),
		orderBy: (t, { asc }) => asc(t.joinedAt),
		with: {
			user: {
				columns: { id: true, name: true },
				with: {
					wishlists: {
						orderBy: (t, { desc }) => desc(t.activityAt),
						limit: 4,
					},
				},
			},
		},
	});

	const pendingInvites = await parent().then(({ circle, isOwn }) => {
		if (!isOwn) return [];
		return db().query.CircleInviteTable.findMany({
			where: (t, { eq }) => eq(t.circleId, circle.id),
			orderBy: (t, { desc }) => desc(t.createdAt),
		});
	});

	return { members, pendingInvites };
};
