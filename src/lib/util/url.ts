export function cleanBaseName(url: URL) {
	const host = url.hostname;
	const parts = host.split('.');
	if (parts.length >= 3) return parts[parts.length - 2];
	return parts[0];
}
