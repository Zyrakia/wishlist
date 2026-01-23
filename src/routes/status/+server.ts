import { AdminService } from '$lib/server/services/admin';
import { unwrap } from '$lib/server/util/service';

export const GET = async () => {
	try {
		unwrap(await AdminService.checkPing());
	} catch (err) {
		console.warn(err);
		return new Response('ERROR', { status: 500 });
	}

	return new Response('OK', { status: 200 });
};
