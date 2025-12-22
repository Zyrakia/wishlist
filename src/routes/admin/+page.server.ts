import { checkRole } from '$lib/remotes/auth.remote';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import z from 'zod';

export const load: PageServerLoad = async () => {
	const isAdmin = await checkRole({ targetRole: 'ADMIN' });
	if (!isAdmin) redirect(303, '/');
};
