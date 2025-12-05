import { resolveMySession } from '$lib/remotes/auth.remote';
import { db } from '$lib/server/db';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const invite = await db().query.GroupInviteTable.findFirst({
		where: (t, { eq }) => eq(t.id, params.invite_id),
		with: {
			group: {
				columns: { name: true },
				with: { owner: { columns: { name: true } } },
			},
		},
	});

	const me = await resolveMySession();
	return { invite, me };
};
