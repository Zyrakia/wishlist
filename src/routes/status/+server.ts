import { AdminService } from '$lib/server/services/admin';

export const GET = async () => {
	try {
		const result = await AdminService.checkPing();
		if (result.err) throw result.val;
	} catch (err) {
		console.warn(err);
		return new Response('ERROR', { status: 500 });
	}

	return new Response('OK', { status: 200 });
};
