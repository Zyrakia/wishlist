import { query } from '$app/server';
import { devices } from 'playwright';
import { load as cheerio } from 'cheerio';
import { RequiredUrlSchema } from '$lib/schemas/item';

export const readMetadata = query(RequiredUrlSchema, async (url) => {
	const target = new URL(url);
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
		target.hostname;

	const favicons = $('link[rel]').filter((_, el) => {
		const rel = ($(el).attr('rel') || '').toLowerCase();
		return /\bicon\b|shortcut icon|apple-touch-icon|mask-icon/.test(rel);
	});

	return { title, favicon: favicons.attr('href') || '' };
});
