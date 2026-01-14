import { AdminService } from '$lib/server/services/admin';
import { unwrap } from '$lib/util/safe-call';

export const GET = async () => {
	try {
		unwrap(await AdminService.ping());
	} catch (err) {
		console.warn(err);
		return new Response('ERROR', { status: 500 });
	}

	return new Response('OK', { status: 200 });
};
