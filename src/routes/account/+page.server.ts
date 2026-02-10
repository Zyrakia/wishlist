import { resolveMe } from '$lib/remotes/auth.remote';
import { safePruneParams } from '$lib/util/safe-prune';
import { UrlBuilder } from '$lib/util/url';
import z from 'zod';

import { redirect } from '@sveltejs/kit';

import type { PageServerLoad } from './$types';
const ParamsSchema = z.object({
	change: z.enum(['name', 'email', 'password']),
	notice: z.string(),
});

export const load: PageServerLoad = async ({ url }) => {
	const me = await resolveMe({});
	if (!me) redirect(303, UrlBuilder.from('/login').param('return', '/account').toPath());

	const props = safePruneParams(ParamsSchema, url.searchParams);

	return { me, ...props };
};
