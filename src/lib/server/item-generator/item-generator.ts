import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { load as cheerio } from 'cheerio';
import { chromium } from 'playwright';
import z from 'zod';
import ENV from '../env.server';

const SYSTEM_PROMPT = `
You are to extract the single best product candidate from the given input.
If any product closely relates to the title, it is the core product.

**Name Formatting Guidelines**
- Keep the core product identity—what a person would call it.
- Remove redundant details: sizes, color codes, SKUs, store names, promo text, “New,” duplicates.
- Keep essential identifiers like brand + model, but not descriptors of function or appearance of the product.
- Avoid truncation that removes necessary context; prefer the shortest clear form when multiple appear.

**General Extraction Rules**
- Prefer clearly grouped name-price-image clusters over isolated mentions.
- For product grids, treat each item as a separate candidate.
- If the page centers on a single product, return one candidate.
- Ignore unrelated text like menus, reviews, ads, shipping details.
- Select prices most likely to be the actual selling price; avoid list/per-unit/off-sale unless clearly the main price.
- Infer currency via explicit symbols/codes, metadata, or URL/locale hints; otherwise default to USD.
- Prefer a clear standalone product image near the name or price.

**Output Requirements**
- Omit any candidates missing both price and image.
`;

const google = createGoogleGenerativeAI({ apiKey: ENV.GOOGLE_AI_KEY });

const CandidateSchema = z
	.object({
		name: z.string(),
		imageUrl: z.string(),
		price: z.number(),
		priceCurrency: z.string().length(3).toUpperCase(),
	})
	.optional();

async function renderUrl(url: string) {
	const UA =
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36 ProductFinder';

	const browser = await chromium.launch({ headless: true });
	const page = await browser.newPage({ userAgent: UA });

	try {
		const res = await page.goto(url, { waitUntil: 'domcontentloaded' });
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

	$('script, style, noscript, link, meta, head').remove();
	$('nav, footer, header, aside').remove();
	$('[role="navigation"], [role="banner"], [role="contentinfo"]').remove();

	const meta: Record<string, string> = {};
	$('meta').each((_, el) => {
		const $el = $(el);
		const property = $el.attr('name') || $el.attr('property');
		const content = $el.attr('content');

		if (property && content && (property.startsWith('og:') || property.startsWith('twitter:'))) {
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

	let textContent = $('main').text() || $('body').text();
	textContent = textContent
		.replace(/\n\s+/g, '\n')
		.replace(/\s\s{3,}/g, '\n')
		.trim();

	return JSON.stringify({ pageTitle, pageDescription, meta, images, textContent });
}

export async function generateItemCandidates(url: string) {
	const parsedUrl = new URL(url);

	const html = await renderUrl(url);
	if (!html) return;

	const distilledPage = distillPage(html, parsedUrl.origin);
	const { object: candidates } = await generateObject({
		model: google('gemini-2.5-flash-lite'),
		schema: CandidateSchema.optional(),
		messages: [
			{ role: 'system', content: SYSTEM_PROMPT },
			{ role: 'user', content: `URL: ${url}` },
			{ role: 'user', content: `Distilled Page Data:\n${distilledPage}` },
		],
	});

	return candidates;
}
