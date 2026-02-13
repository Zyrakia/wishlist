import type { PageServerLoad } from './$types';
import z from 'zod';
import { safePruneParams } from '$lib/util/safe-prune';
import { listUsers, listErroredConnections } from '$lib/remotes/admin.remote';

const ParamsSchema = z.object({
	limit: z.coerce.number().int().min(1).max(100),
	userPage: z.coerce.number().int().min(0),
	connectionsPage: z.coerce.number().int().min(0),
});

export const load: PageServerLoad = async ({ url }) => {
	const {
		userPage = 0,
		connectionsPage = 0,
		limit = 10,
	} = safePruneParams(ParamsSchema, url.searchParams);

	const [users, connections] = await Promise.all([
		listUsers({ page: userPage, limit }),
		listErroredConnections({ page: connectionsPage, limit }),
	]);

	return { users, connections };
};
