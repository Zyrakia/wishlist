import { safePrune } from '$lib/util/safe-prune';
import z from 'zod';

import type { PageServerLoad } from './$types';
const searchParams = z.object({ updated: z.enum(['password']).optional() });

export const load: PageServerLoad = (event) => {
	const params = safePrune(searchParams, Object.fromEntries(event.url.searchParams.entries()));
	return { showHeader: false, ...params };
};
