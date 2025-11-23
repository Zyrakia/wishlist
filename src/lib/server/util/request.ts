import type { RequestEvent } from '@sveltejs/kit';
import ENV from '../env.server';

export function getRequestAddress(event: RequestEvent) {
	const header = ENV.ADDRESS_HEADER;
	if (header) {
		const raw = event.request.headers.get(header);
		if (raw) return raw.split(',')[0].trim();
	}

	return event.getClientAddress();
}
