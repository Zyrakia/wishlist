import { db } from '$lib/server/db';

export const GET = async () => {
	try {
		db();
	} catch (err) {
		console.warn(err);
		return new Response('ERROR', { status: 500 });
	}

	return new Response('OK', { status: 200 });
};
