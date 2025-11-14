import { resolveMe } from '$lib/remotes/auth.remote';
import { db } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const invite = await db().query.CircleInviteTable.findFirst({
		where: (t, { eq }) => eq(t.id, params.invite_id),
		with: {
			circle: {
				columns: { name: true },
				with: { owner: { columns: { name: true } } },
			},
		},
	});

	const me = await resolveMe();

	return { invite, me };
};
