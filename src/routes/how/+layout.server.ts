import { safePrune } from '$lib/util/safe-prune';
import { isRelativePath } from '$lib/util/url';
import z from 'zod';

import type { LayoutServerLoad } from './$types';
const searchParams = z.object({
	return: z.string().refine(isRelativePath, { error: 'Invalid return URL' }),
});

export const load: LayoutServerLoad = (event) => {
	const params = safePrune(searchParams, Object.fromEntries(event.url.searchParams.entries()));
	return { showHeader: !params.return, ...params };
};
