import { resolveMe } from '$lib/remotes/auth.remote';

import { redirect } from '@sveltejs/kit';

import type { PageServerLoad } from './$types';
import z from 'zod';
import { safePruneParams } from '$lib/util/safe-prune';

const ParamsSchema = z.object({
	change: z.enum(['name', 'email', 'password']),
	notice: z.string(),
});

export const load: PageServerLoad = async ({ url }) => {
	const me = await resolveMe({});
	if (!me) redirect(303, '/login?return=/account');

	const props = safePruneParams(ParamsSchema, url.searchParams);

	return { me, ...props };
};
