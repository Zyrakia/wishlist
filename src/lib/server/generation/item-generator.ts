import { APICallError, generateObject } from 'ai';
import { load as cheerio } from 'cheerio';
import { chromium, devices } from 'playwright';
import z from 'zod';

import { createMistral } from '@ai-sdk/mistral';

import ENV from '../env.server';
import { safeCall } from '$lib/util/safe-call';

const SYSTEM_PROMPT = `
You are to extract the best product candidate from the given input.

If it is a single product page, the page title often indicates the name of the core product on the page.

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

If you find an item that satisfies all criteria, most likely being a candidate,
summarize it and make sure to set "valid" to \`true\` on the candidate.

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
	url: z.url().optional(),
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

interface DistillOptions {
	stripRelativeLinks?: boolean;
}

function distillPage(
	html: string,
	baseUrl: string,
	{ stripRelativeLinks = true }: DistillOptions = {},
) {
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

	$('script, style, noscript, link, meta, head').remove();
	$('nav, footer, header, aside').remove();
	$('[role="navigation"], [role="banner"], [role="contentinfo"]').remove();

	const contentHolder = $('main').length ? $('main') : $('body');

	const images = contentHolder
		.find('img')
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

	contentHolder.find('a').replaceWith(function () {
		const link = $(this);
		const text = link.text();
		let href = link.attr('href');

		if (!text || !href) return '';
		if (!href.startsWith('https')) {
			if (stripRelativeLinks) return '';
			try {
				href = new URL(href, baseUrl).href;
			} catch (err) {
				return '';
			}
		}

		return `[${text}](${href})`;
	});

	const textContent = contentHolder
		.text()
		.replace(/\n\s+/g, '\n')
		.replace(/\s\s{3,}/g, '\n')
		.trim();

	return JSON.stringify({ pageTitle, pageDescription, meta, images, textContent });
}

type Result<R, E> = { data: R; error: null } | { data: null; error: E };

async function distillUrl(url: string, opts?: DistillOptions): Promise<Result<string, string>> {
	const { data: parsedUrl } = safeCall(() => new URL(url));
	if (!parsedUrl) return { data: null, error: 'Invalid URL' };

	const html = await renderUrl(url);
	if (!html) return { data: null, error: 'Cannot load page' };

	return { data: distillPage(html, parsedUrl.origin, opts), error: null };
}

export async function generateItemCandidate(
	url: string,
): Promise<Result<z.infer<typeof CandidateSchema>, string>> {
	const { data: page, error } = await distillUrl(url);
	if (error) return { data: null, error };

	try {
		const { object: candidate } = await generateObject({
			model: modelHost('mistral-small-latest'),
			schema: CandidateSchema,
			maxRetries: 0,
			messages: [
				{ role: 'system', content: SYSTEM_PROMPT },
				{ role: 'system', content: 'You are to extract only the single best candidate.' },
				{ role: 'user', content: `URL: ${url}` },
				{ role: 'user', content: `Distilled Page Data:\n${page}` },
			],
		});

		if (!candidate?.valid) return { data: null, error: 'No product found' };

		return { data: candidate, error: null };
	} catch (err) {
		console.warn(err);
		if (APICallError.isInstance(err) && err.statusCode === 429) {
			return { data: null, error: 'Generation temporarily unavailable' };
		}

		return { data: null, error: 'Generation failed' };
	}
}

export async function generateItemCandidates(
	url: string,
): Promise<Result<z.infer<typeof CandidateSchema>[], string>> {
	const { data: page, error } = await distillUrl(url, { stripRelativeLinks: false });
	if (error) return { data: null, error };

	try {
		const {
			object: { result: candidates },
			usage,
		} = await generateObject({
			model: modelHost('mistral-small-latest'),
			schema: z.object({ result: z.array(CandidateSchema) }),
			maxRetries: 0,
			messages: [
				{ role: 'system', content: SYSTEM_PROMPT },
				{
					role: 'system',
					content:
						'You are to extract all the candidates you can find (while following the guidelines for each). Place all of the valid candidates into the result array.',
				},
				{ role: 'user', content: `URL: ${url}` },
				{ role: 'user', content: `Distilled Page Data:\n${page}` },
			],
		});

		return { data: candidates.filter((v) => v.valid), error: null };
	} catch (err) {
		console.warn(err);
		if (APICallError.isInstance(err) && err.statusCode === 429) {
			return { data: null, error: 'Generation temporarily unavailable' };
		}

		return { data: null, error: 'Generation failed' };
	}
}
