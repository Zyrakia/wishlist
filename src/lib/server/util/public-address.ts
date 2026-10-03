import { lookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';

const privateRanges = new BlockList();

for (const [address, prefix] of [
	['0.0.0.0', 8],
	['10.0.0.0', 8],
	['100.64.0.0', 10],
	['127.0.0.0', 8],
	['169.254.0.0', 16],
	['172.16.0.0', 12],
	['192.0.0.0', 24],
	['192.168.0.0', 16],
	['198.18.0.0', 15],
	['224.0.0.0', 3],
] as const) {
	privateRanges.addSubnet(address, prefix, 'ipv4');
}

for (const [address, prefix] of [
	['::', 96],
	['64:ff9b::', 96],
	['fc00::', 7],
	['fe80::', 10],
	['ff00::', 8],
] as const) {
	privateRanges.addSubnet(address, prefix, 'ipv6');
}

const isPublicIp = (ip: string) => {
	const family = isIP(ip);
	if (!family) return false;
	return !privateRanges.check(ip, family === 4 ? 'ipv4' : 'ipv6');
};

/**
 * Resolves a hostname, only if every address it resolves to is publicly routable.
 *
 * @param hostname the hostname or IP literal to resolve
 * @returns an address to connect to, or undefined if any address is private
 */
export const resolvePublicAddress = async (hostname: string) => {
	const host = hostname.replace(/^\[|\]$/g, '');
	if (isIP(host)) return isPublicIp(host) ? host : undefined;

	try {
		const addresses = await lookup(host, { all: true });
		if (!addresses.every(({ address }) => isPublicIp(address))) return;
		return addresses[0]?.address;
	} catch {
		return;
	}
};

/**
 * Checks that a URL is http(s) and its host only resolves to publicly routable addresses.
 *
 * @param url the URL to check
 */
export const isPublicUrl = async (url: URL) => {
	if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
	return !!(await resolvePublicAddress(url.hostname));
};

/**
 * Fetches a public URL, following redirects only while they stay on public addresses.
 *
 * @param url the URL to fetch
 * @param init the fetch options, `redirect` is always handled manually
 * @param maxRedirects the maximum number of redirects to follow
 */
export const fetchPublic = async (url: URL, init: RequestInit = {}, maxRedirects = 5) => {
	let target = url;

	for (let hop = 0; hop <= maxRedirects; hop++) {
		if (!(await isPublicUrl(target))) return;

		const res = await fetch(target, { ...init, redirect: 'manual' });
		const location = res.headers.get('location');
		if (res.status < 300 || res.status >= 400 || !location) return res;

		await res.body?.cancel();
		target = new URL(location, target);
	}
};
