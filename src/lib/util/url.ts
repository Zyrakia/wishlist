import { safeCall } from './safe-call';

export function cleanBaseName(url: string | URL) {
	let hostname: string | undefined;
	if (typeof url === 'string') {
		let { data } = safeCall(() => new URL(url).hostname);
		if (data) hostname = data;
	}

	if (!hostname) return '';

	const parts = hostname.split('.');
	if (parts.length >= 3) return parts[parts.length - 2];
	return parts[0];
}
