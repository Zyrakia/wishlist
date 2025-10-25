import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { load as cheerio } from 'cheerio';
import { chromium } from 'playwright';
import z from 'zod';
import ENV from '../env.server';

const google = createGoogleGenerativeAI({ apiKey: ENV.GEMINI_KEY });

const CandidateSchema = z.object({
	name: z.string(),
	imageUrl: z.string(),
	price: z.number(),
	priceCurrency: z.string().length(3).toUpperCase(),
});

async function renderUrl(url: string) {
	const UA =
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36 ProductFinder';

	const browser = await chromium.launch();
	const page = await browser.newPage({ userAgent: UA });

	try {
		const res = await page.goto(url, { waitUntil: 'networkidle' });
		if (!res || res.status() !== 200) return;

		return await page.content();
	} catch (err) {
		return;
	} finally {
		browser.close();
	}
}

function distillPage(html: string, baseUrl: string) {
	const $ = cheerio(html);

	const pageTitle = $('title').text();
	const pageDescription = $('meta[name="description"]').attr('content');

	const meta: Record<string, string> = {};
	$('meta').each((_, el) => {
		const $el = $(el);
		const property = $el.attr('name') || $el.attr('property');
		const content = $el.attr('content');

		if (
			property &&
			content &&
			(property.startsWith('og:') || property.startsWith('twitter:'))
		) {
			meta[property] = content;
		}
	});

	const images = $('img')
		.map((_, el) => {
			const $el = $(el);

			const src = $el.attr('src');
			const alt = $el.attr('alt') || '';

			if (!src || !alt) return;

			try {
				const absoluteSrc = new URL(src, baseUrl).href;
				return { src: absoluteSrc, alt };
			} catch (err) {}
		})
		.get();

	$('script, style, noscript, link, meta, head').remove();
	$('nav, footer, header, aside').remove();
	$('[role="navigation"], [role="banner"], [role="contentinfo"]').remove();

	let textContent = $('main').text() || $('body').text();
	textContent = textContent.replace(/\s\s+/g, ' ');

	return JSON.stringify({ pageTitle, pageDescription, meta, images, textContent });
}

export async function generateItemCandidates(url: string) {
	try {
		const parsedUrl = new URL(url);

		const html = await renderUrl(url);
		if (!html) return;

		const pageData = distillPage(html, parsedUrl.origin);
		console.log(pageData);
	} catch (err) {}

	// const { object: candidates } = await generateObject({
	// 	model: google('gemini-2.5-flash-lite'),
	// 	schema: z.array(CandidateSchema),
	// 	messages: [
	// 		{ role: 'system', content: '' },
	// 		{ role: 'user', content: `URL: ${url}` },
	// 		{ role: 'user', content: `Page extraction data: \n${pageData}` },
	// 	],
	// });

	// return candidates;
}

generateItemCandidates(
	'https://www.amazon.com/Glass-Shower-Magnet-Replacement-Swing/dp/B0F4CVM7V3',
);
