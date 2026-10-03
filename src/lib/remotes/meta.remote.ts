import { query } from '$app/server';
import { RequiredUrlSchema } from '$lib/schemas/item';
import { verifyAuth } from '$lib/server/auth';
import { fetchPublic } from '$lib/server/util/public-address';
import { formatHost, parseUrl } from '$lib/util/url';
import { load as cheerio } from 'cheerio';
import { devices } from 'playwright';

const MAX_HTML_LENGTH = 512 * 1024;

const readHead = async (res: Response) => {
	if (!res.body) return '';

	const reader = res.body.getReader();
	const decoder = new TextDecoder();
	let html = '';

	while (html.length < MAX_HTML_LENGTH) {
		const { done, value } = await reader.read();
		if (done) return html + decoder.decode();
		html += decoder.decode(value, { stream: true });
		if (/<\/head>/i.test(html)) break;
	}

	await reader.cancel();
	return html;
};

export const readMetadata = query(RequiredUrlSchema, async (url) => {
	verifyAuth({ failStrategy: 'error' });

	try {
		const target = parseUrl(url);
		if (!target) return;

		const res = await fetchPublic(target, {
			signal: AbortSignal.timeout(8000),
			headers: {
				'user-agent': devices['Desktop Chrome'].userAgent,
				'accept': 'text/html,*/*;q=0.8',
			},
		});
		if (!res?.headers.get('content-type')?.includes('html')) return;

		const $ = cheerio(await readHead(res));

		const title =
			$('title').first().text().trim() ||
			$('meta[property="og:title"]').attr('content') ||
			$('meta[name="twitter:title"]').attr('content') ||
			formatHost(target, { subdomain: false, tld: true }) ||
			target.hostname;

		const favicons = $('link[rel]').filter((_, el) => {
			const rel = ($(el).attr('rel') || '').toLowerCase();
			return /\bicon\b|shortcut icon|apple-touch-icon|mask-icon/.test(rel);
		});

		return { title, favicon: favicons.attr('href') };
	} catch (err) {
		return;
	}
});
