import { generateObject } from 'ai';
import { load as cheerio } from 'cheerio';
import { chromium, devices } from 'playwright';
import z from 'zod';

import { createMistral } from '@ai-sdk/mistral';
import { isHttpError } from '@sveltejs/kit';

import ENV from '../env.server';

const SYSTEM_PROMPT = `
You are to extract the single best product candidate from the given input.
The page title often indicates the name of the core product on the page.

**Name Formatting Guidelines**
- MUST be below 30 characters (including whitespace and punctuation), so please summarize the name diligently
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

If you find an item on the page that satisfies every criteria and is a very
likely candidate, summarize it in the requested shape and set "valid" to "true".

If you do not find anything, please do not return any of the fields, only "valid" set to "false".,

**Output Requirements**
- A name is always required for a candidate to exist
- All other properties are optional, and should only be included if they are associated with the candidate.
- If a candidate was found, summarize it in the requested shape and ensure you set "valid" to \`true\`.
- If there was no candidate found at all, do not return any of the fields besides "valid" set to \`false\`.
`;

const modelHost = createMistral({ apiKey: ENV.MISTRAL_AI_KEY });

const CandidateSchema = z.object({
	valid: z.boolean(),
	name: z.string().optional(),
	imageUrl: z.string().optional(),
	price: z.number().optional(),
	priceCurrency: z.string().length(3).toUpperCase().optional(),
});

async function renderUrl(url: string) {
	const UA = devices['Desktop Chrome'].userAgent;

	const browser = await chromium.launch({ headless: true });
	const page = await browser.newPage({
		userAgent: UA,
		locale: 'en-US',
		timezoneId: 'America/New_York',
		viewport: { width: 1366, height: 768 },
		extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' },
	});

	try {
		const res = await page.goto(url, { waitUntil: 'domcontentloaded' });
		if (!res || res.status() !== 200) return;

		return await page.content();
	} catch (err) {
		console.warn(err);
		return;
	} finally {
		await page.close().then(() => browser.close());
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

	let textContent = $('main').text() || $('body').text();
	textContent = textContent
		.replace(/\n\s+/g, '\n')
		.replace(/\s\s{3,}/g, '\n')
		.trim();

	return JSON.stringify({ pageTitle, pageDescription, meta, images, textContent });
}

export async function generateItemCandidates(
	url: string,
): Promise<
	| { success: true; candidate?: z.infer<typeof CandidateSchema> }
	| { success: false; error: string }
> {
	try {
		const parsedUrl = new URL(url);

		const html = await renderUrl(url);
		if (!html) return { success: false, error: 'Cannot load page' };

		const distilledPage = distillPage(html, parsedUrl.origin);

		try {
			const { object: candidate } = await generateObject({
				model: modelHost('mistral-small-latest'),
				schema: CandidateSchema.optional(),
				messages: [
					{ role: 'system', content: SYSTEM_PROMPT },
					{ role: 'user', content: `URL: ${url}` },
					{ role: 'user', content: `Distilled Page Data:\n${distilledPage}` },
				],
			});

			if (!candidate?.valid) return { success: false, error: 'No product found' };

			return { success: true, candidate };
		} catch (err) {
			console.warn(err);
			return { success: false, error: 'Generation failed' };
		}
	} catch (err) {
		if (isHttpError(err)) throw err;
		console.warn(err);
		return { success: false, error: 'Cannot load page' };
	}
}
