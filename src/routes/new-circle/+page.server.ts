import { verifyAuth } from '$lib/server/auth';
import { db } from '$lib/server/db';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const user = verifyAuth();

	const ownedCircle = await db().query.CircleTable.findFirst({
		where: (t, { eq }) => eq(t.ownerId, user.id),
	});

	return { ownedCircle };
};
