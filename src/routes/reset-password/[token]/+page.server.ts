import { peekAccountAction } from '$lib/server/account-action';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const action = await peekAccountAction(params.token, 'reset-password');
	return { token: params.token, email: action?.user.email };
};
