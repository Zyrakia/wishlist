import { resolveMe } from '$lib/remotes/auth.remote';
import { verifyAuth } from '$lib/server/auth';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	verifyAuth();

	const me = await resolveMe();
	if (!me) redirect(301, '/login?return=/account');

	return { me };
};
