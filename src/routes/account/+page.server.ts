import { resolveMe } from '$lib/remotes/auth.remote';
import { safePruneParams } from '$lib/util/safe-prune';

import type { PageServerLoad } from './$types';
import z from 'zod';

const paramsSchema = z.object({
	mode: z.enum(['changeEmail', 'emailChanged']),
	newEmail: z.string(),
	token: z.string(),
});

export const load: PageServerLoad = async (event) => {
	const me = await resolveMe({});

	const params = safePruneParams(paramsSchema, event.url.searchParams);
	return { me, ...params };
};
