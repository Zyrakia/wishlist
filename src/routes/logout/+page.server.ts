import { clearSession } from '$lib/server/auth';

import { redirect } from '@sveltejs/kit';

import type { PageServerLoad } from './$types';
export const ssr = false;

export const load: PageServerLoad = async ({ cookies }) => {
	clearSession(cookies);
	redirect(303, '/');
};
