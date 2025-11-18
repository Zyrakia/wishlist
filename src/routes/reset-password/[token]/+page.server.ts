import { peekAccountAction } from '$lib/server/auth';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const action = await peekAccountAction(params.token);
	return { token: params.token, email: action?.user.email };
};
