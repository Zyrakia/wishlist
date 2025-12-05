import { verifyAuth } from '$lib/server/auth';
import { db } from '$lib/server/db';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const user = verifyAuth();

	const ownedGroup = await db().query.GroupTable.findFirst({
		where: (t, { eq }) => eq(t.ownerId, user.id),
	});

	return { ownedGroup };
};
