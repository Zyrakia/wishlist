import { checkRole } from '$lib/remotes/auth.remote';
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async () => {
	const isAdmin = await checkRole({ targetRole: 'ADMIN' });
	if (!isAdmin) redirect(303, '/');
};
