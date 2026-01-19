import { $safeCall } from './result';

export function cleanBaseName(url: string | URL) {
	let hostname: string | undefined;
	if (typeof url === 'string') {
		const result = $safeCall(() => new URL(url).hostname);
		if (result.kind === 'success') hostname = result.data;
	} else hostname = url.hostname;

	if (!hostname) return '';

	const parts = hostname.split('.');
	if (parts.length >= 3) return parts[parts.length - 2];
	return parts[0];
}
