import z from 'zod';
import type { PageLoad } from './$types';
import { safePrune } from '$lib/util/safe-prune';
import { CredentialsSchema } from '$lib/schemas/auth';

export const load: PageLoad = (event) => {
	const init = safePrune(
		z.object({
			email: CredentialsSchema.shape.email.default(''),
		}),
		Object.fromEntries(event.url.searchParams.entries()),
	);

	return init;
};
