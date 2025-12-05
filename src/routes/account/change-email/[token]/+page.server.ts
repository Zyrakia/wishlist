import { peekAccountAction } from '$lib/server/account-action';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const action = await peekAccountAction(params.token, 'change-email');
	return { newEmail: action?.payload.newEmail, token: params.token };
};
