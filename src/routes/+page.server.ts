import { getRequestEvent } from '$app/server';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	const {
		locals: { user },
	} = getRequestEvent();

	if (!user) redirect(301, `/login?redirect=${encodeURIComponent('/lists')}`);
};
