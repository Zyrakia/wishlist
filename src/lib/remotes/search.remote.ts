import { query } from '$app/server';
import { PromptSchema } from '$lib/schemas/search.js';
import { verifyAuth } from '$lib/server/auth';
import { SearchService } from '$lib/server/services/search/search';
import { unwrapOrDomain } from '$lib/server/util/service';
import z from 'zod';

export const runGlobalSearch = query(z.object({ query: PromptSchema }), async ({ query }) => {
	const user = verifyAuth({ failStrategy: 'login' });
	const result = await SearchService.searchAsUser(query, user.id);
	return unwrapOrDomain(result, (error) => ({ error }));
});
