import { APICallError, generateObject } from 'ai';
import { load as cheerio } from 'cheerio';
import { chromium, devices, type Page } from 'playwright';
import z from 'zod';

import { createMistral } from '@ai-sdk/mistral';

import ENV from '../env.server';
import { safeCall, wrapSafeAsync } from '$lib/util/safe-call';

const SYSTEM_PROMPT = `
You are to extract the best product candidate from the given input.

The input will be a stringified JSON object, containing extraction data from a webpage.

If it is a single product page, the page title often indicates the name of the core product on the page.
Please try your hardest to discern every single candidate on the page, it is your only goal.

**Name Formatting Guidelines**
- MUST be below 30 characters (including whitespace and punctuation), so please summarize the name diligently
- Keep the core product identity - what a person would call it when referencing it conversation.
- Remove redundant details: sizes, color codes, SKUs, store names, promo text, "New," duplicates.
- Keep essential identifiers like brand + model, but not descriptors of function or appearance of the product.
- Avoid truncation that removes necessary context; prefer the shortest clear form when multiple appear.

**General Extraction Rules**
- Prefer clearly grouped name-price-image clusters over isolated mentions.
- For product grids, treat each item as a separate candidate.
- Ignore unrelated text like menus, reviews, ads, shipping details.
- Select prices most likely to be the actual current selling price; avoid list/per-unit/off-sale unless clearly the main price.
- Infer currency via explicit symbols/codes, metadata, or URL/locale hints; otherwise default to USD.
- Prefer a clear standalone product image near the name or price.
- When multiple candidates are available, take extra care to ensure you do not mix up images and names between the items.

If you find an item that satisfies all criteria, most likely being a candidate,
summarize it and make sure to set "valid" to \`true\` on the candidate.

**Output Requirements**
- A name is always required for a candidate to exist
- All other properties are optional, and should only be included if they are confidently associated with the candidate.
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

async function scrollToBottom(page: Page, maxScrolls: number) {
	const waitMs = 1000;

	let lastHeight = await page.evaluate(() => document.body.scrollHeight);

	for (let i = 0; i < maxScrolls; i++) {
		await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
		await page.waitForTimeout(waitMs);

		const newHeight = await page.evaluate(() => document.body.scrollHeight);
		if (newHeight === lastHeight) break;

		lastHeight = newHeight;
	}
}

interface RenderOptions {
	maxScrolls?: number;
}

interface DistillOptions {
	stripRelativeLinks?: boolean;
}

async function renderUrl(url: string, { maxScrolls }: RenderOptions = {}) {
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

		if (maxScrolls) await scrollToBottom(page, maxScrolls);
		return await page.content();
	} catch (err) {
		console.warn(err);
	} finally {
		await page.close().then(() => browser.close());
	}
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

const distillUrl = wrapSafeAsync(
	async (url: string, renderOptions?: RenderOptions, distillOptions?: DistillOptions) => {
		const { data: parsedUrl, success: isValidUrl } = safeCall(() => new URL(url));
		if (!isValidUrl) throw 'Invalid URL';

		const html = await renderUrl(parsedUrl.href, renderOptions);
		if (!html) throw 'Cannot load page';

		return distillPage(html, parsedUrl.origin, distillOptions);
	},
);

export const generateItemCandidate = wrapSafeAsync(async (url: string) => {
	const { data: page, error } = await distillUrl(url);
	if (error) throw error;

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

		if (!candidate?.valid) throw 'No product found';
		return candidate;
	} catch (err) {
		console.warn(err);

		if (APICallError.isInstance(err) && err.statusCode === 429) {
			throw 'Generation temporarily unavailable';
		}

		throw 'Generation failed';
	}
});

export const generateItemCandidates = wrapSafeAsync(async (url: string) => {
	const { data: page, error } = await distillUrl(
		url,
		{ maxScrolls: 3 },
		{ stripRelativeLinks: false },
	);

	if (error) throw error;

	try {
		const {
			object: { result: candidates },
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

		return candidates.filter((v) => v.valid);
	} catch (err) {
		console.warn(err);
		if (APICallError.isInstance(err) && err.statusCode === 429) {
			throw 'Generation temporarily unavailable';
		}

		throw 'Generation failed';
	}
});
