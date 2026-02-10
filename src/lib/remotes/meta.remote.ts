import { query } from '$app/server';
import { RequiredUrlSchema } from '$lib/schemas/item';
import { formatHost, parseUrl } from '$lib/util/url';
import { load as cheerio } from 'cheerio';
import { devices } from 'playwright';

export const readMetadata = query(RequiredUrlSchema, async (url) => {
	try {
		const target = parseUrl(url);
		if (!target) return;

		const res = await fetch(target, {
			redirect: 'follow',
			headers: {
				'user-agent': devices['Desktop Chrome'].userAgent,
				'accept': 'text/html,*/*;q=0.8',
			},
		});

		const html = await res.text();
		const $ = cheerio(html);

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
