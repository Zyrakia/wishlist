import { checkRole } from '$lib/remotes/auth.remote';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const isAdmin = await checkRole({ targetRole: 'ADMIN' });
	if (!isAdmin) redirect(303, '/');
};
