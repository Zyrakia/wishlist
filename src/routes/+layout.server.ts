import { getRequestEvent } from '$app/server';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = () => {
	const {
		locals: { user },
	} = getRequestEvent();

	return { user };
};
