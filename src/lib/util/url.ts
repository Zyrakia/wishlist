import { parse as tldts } from 'tldts';

type UrlProtocol = 'https' | 'http';

export interface ParseUrlOptions {
	assumeProtocol?: UrlProtocol;
	allowedProtocols?: readonly string[];
	base?: string | URL;
}

export type UrlPartKey =
	| 'href'
	| 'origin'
	| 'protocol'
	| 'username'
	| 'password'
	| 'host'
	| 'hostname'
	| 'port'
	| 'pathname'
	| 'search'
	| 'hash';

type UrlQueryValue = string | number | boolean | null | undefined;

const DEFAULT_ALLOWED_PROTOCOLS = ['https:', 'http:'];
const INTERNAL_BASE = 'https://local.invalid';
const INTERNAL_BASE_ORIGIN = new URL(INTERNAL_BASE).origin;

const normalizePath = (path: string) => (path.startsWith('/') ? path : `/${path}`);

const normalizeHash = (hash: string | null | undefined) => (hash || '').replace(/^#/, '');

const normalizeProtocol = (input: string) => (input.endsWith(':') ? input : `${input}:`);

const hasAnyScheme = (value: string): boolean => {
	const colonIndex = value.indexOf(':');
	if (colonIndex === -1) return false;

	const scheme = value.slice(0, colonIndex);

	// RFC 3986 scheme validation: starts with letter, then letters/digits/+.-
	if (!/^[a-z][a-z0-9+.-]*$/i.test(scheme)) return false;

	// Accepted tradeoff: any valid "<token>:" prefix is treated as an explicit scheme.
	// This avoids coercing opaque schemes, but requires explicit "http(s)://" for host:port inputs.
	return true;
};

const parseStringUrl = (
	rawInput: string,
	{ assumeProtocol, base }: { assumeProtocol: UrlProtocol; base?: string | URL },
) => {
	const value = rawInput.trim();
	if (!value) return;

	if (base) return new URL(value, base);
	if (value.startsWith('/')) return;
	if (hasAnyScheme(value)) return new URL(value);

	return new URL(`${assumeProtocol}://${value.replace(/^\/+/, '')}`);
};

const parseInputUrl = (
	input: string | URL,
	{ assumeProtocol, base }: { assumeProtocol: UrlProtocol; base?: string | URL },
) => {
	if (input instanceof URL) return new URL(input.href);
	return parseStringUrl(input, { assumeProtocol, base });
};

export const isRelativePath = (url: string) => /^\/(?!\/)/.test(url.trim());

export const parseUrl = (input: string | URL, opts: ParseUrlOptions = {}) => {
	const { assumeProtocol = 'https', allowedProtocols = DEFAULT_ALLOWED_PROTOCOLS, base } = opts;
	const normalizedProtocols = new Set(allowedProtocols.map(normalizeProtocol));

	try {
		const parsed = parseInputUrl(input, { assumeProtocol, base });
		if (!parsed) return;

		if (!normalizedProtocols.has(parsed.protocol)) return;
		return parsed;
	} catch {
		return;
	}
};

const getBuilderSeedUrl = (input?: string | URL) => {
	if (!input) return new URL(INTERNAL_BASE);

	if (input instanceof URL) {
		return new URL(input.href);
	}

	const raw = input.trim();
	if (!raw) return new URL(INTERNAL_BASE);
	if (isRelativePath(raw)) return new URL(raw, INTERNAL_BASE);

	const parsed = parseUrl(raw);
	if (!parsed) return new URL(INTERNAL_BASE);

	return parsed;
};

export class UrlBuilder {
	private url: URL;

	private constructor(seed: URL) {
		this.url = new URL(seed.href);
	}

	public static from(input?: string | URL) {
		return new UrlBuilder(getBuilderSeedUrl(input));
	}

	public path(nextPath: string) {
		this.url.pathname = normalizePath(nextPath.trim() || '/');
		return this;
	}

	public segment(nextSegment: string | number) {
		const safeSegment = String(nextSegment)
			.split('/')
			.filter(Boolean)
			.map((v) => encodeURIComponent(v))
			.join('/');

		if (!safeSegment) return this;

		const basePath = this.url.pathname.replace(/\/+$/, '');
		this.url.pathname = basePath ? `${basePath}/${safeSegment}` : `/${safeSegment}`;

		return this;
	}

	public query(values: Record<string, UrlQueryValue>) {
		for (const [key, value] of Object.entries(values)) {
			this.param(key, value);
		}

		return this;
	}

	public param(key: string, value: UrlQueryValue) {
		if (value === undefined || value === null) this.url.searchParams.delete(key);
		else this.url.searchParams.set(key, String(value));

		return this;
	}

	public removeParam(key: string) {
		this.url.searchParams.delete(key);
		return this;
	}

	public clearQuery() {
		this.url.search = '';
		return this;
	}

	public hash(nextHash: string | null | undefined) {
		const normalized = normalizeHash(nextHash);
		this.url.hash = normalized ? `#${normalized}` : '';
		return this;
	}

	public clearHash() {
		this.url.hash = '';
		return this;
	}

	public toPath() {
		return `${this.url.pathname}${this.url.search}${this.url.hash}`;
	}

	public toAbsolute(base?: string | URL) {
		const baseUrl =
			base || (this.url.origin !== INTERNAL_BASE_ORIGIN ? this.url.origin : undefined);
		if (!baseUrl) throw new Error('Invalid base URL');

		const target = parseUrl(baseUrl);
		if (!target) throw new Error('Invalid base URL');

		target.pathname = this.url.pathname;
		target.search = this.url.search;
		target.hash = this.url.hash;

		return target.href;
	}
}

export const createUrlBuilder = (input?: string | URL) => UrlBuilder.from(input);

export const dissectUrl = <K extends UrlPartKey>(
	input: string | URL,
	...pick: K[]
): Pick<URL, K> | undefined => {
	const parsed = parseUrl(input);
	if (!parsed) return;

	const result = {} as Pick<URL, K>;
	for (const key of pick) result[key] = parsed[key];

	return result;
};

export const formatHost = (
	input: string | URL,
	opts: { subdomain?: boolean; tld?: boolean } = {},
) => {
	const parsed = parseUrl(input);
	if (!parsed) return;

	const { subdomain: includeSub = false, tld: includeTld = true } = opts;

	const {
		domain,
		hostname = '',
		domainWithoutSuffix = '',
		subdomain = '',
	} = tldts(parsed.href, { allowPrivateDomains: true });

	// We can't do reliable checks anyways if tldts cannot parse parts
	if (!domain) return hostname;

	if (includeSub) {
		// +sub +tld
		if (includeTld) return hostname;
		// +sub -tld
		return (subdomain && `${subdomain}.${domainWithoutSuffix}`) || domainWithoutSuffix;
	} else {
		// -sub +tld
		if (includeTld) return domain;
		// -sub -tld
		return domainWithoutSuffix;
	}
};
