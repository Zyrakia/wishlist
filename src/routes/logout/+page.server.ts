import { logout } from '$lib/remotes/auth.remote';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { clearSession } from '$lib/server/auth';

export const ssr = false;

export const load: PageServerLoad = async ({ cookies }) => {
	clearSession(cookies);
	redirect(303, '/');
};
