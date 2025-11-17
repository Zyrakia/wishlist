import { db } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const action = await db().query.PendingAccountActionTable.findFirst({
		columns: {},
		with: { user: { columns: { email: true } } },
		where: (t, { eq }) => eq(t.token, params.token),
	});

	return { token: params.token, email: action?.user.email };
};
