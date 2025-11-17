import { verifyAuth } from '$lib/server/auth';
import { safePrune } from '$lib/util/safe-prune';
import { strBoolean } from '$lib/util/zod';
import z from 'zod';

import type { PageServerLoad } from './$types';
export const load: PageServerLoad = async ({ url, parent }) => {
	const owner = (await parent()).wishlist.userId;
	verifyAuth({ check: (user) => user.id === owner, failStrategy: 'error' });

	const props = safePrune(
		z.object({ continue: strBoolean() }),
		Object.fromEntries(url.searchParams.entries()),
	);

	return { listHeaderBadge: ['Create Mode'], ...props };
};
