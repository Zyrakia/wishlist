import { resolveMe } from '$lib/remotes/auth.remote';

import { redirect } from '@sveltejs/kit';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const me = await resolveMe({});
	if (!me) redirect(303, '/login?return=/account');

	return { me };
};
