import { APICallError, generateObject } from 'ai';
import { load as cheerio } from 'cheerio';
import { chromium, devices, type Page } from 'playwright';
import z, { $output } from 'zod';

import { createMistral } from '@ai-sdk/mistral';

import ENV from '../env.server';
import { safeCall, wrapSafeAsync } from '$lib/util/safe-call';
import TurndownService from 'turndown';
import { reportGenerationUsage } from './usage-stats';

const SYSTEM_PROMPT = `
You are to extract the best product candidate from the given input.

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

const turndownService = new TurndownService({
	headingStyle: 'atx',
	codeBlockStyle: 'fenced',
	hr: '---',
	bulletListMarker: '-',
});

function distillPage(
	html: string,
	baseUrl: string,
	{ stripRelativeLinks = true }: DistillOptions = {},
) {
	const $ = cheerio(html);

	const pageTitle = $('title').text().trim();
	const meta: Record<string, string> = { title: pageTitle };

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

	$('script, style, noscript, iframe, svg, canvas, form, link, meta, button').remove();
	$('nav, footer, header, aside').remove();
	$('[role="navigation"], [role="banner"], [role="contentinfo"]').remove();
	$('.nav, #navFooter, .menu, .footer, .header').remove();
	$('.cookie-banner, .ads, .ad').remove();
	$('.reviews, #reviews, .customerReviews, #customerReviews').remove();

	$('img').each((_, el) => {
		const img = $(el);

		const src = img.attr('src');
		const alt = img.attr('alt');

		if (src && alt) {
			const { data: absoluteSrc } = safeCall(() => new URL(src, baseUrl).href);
			if (absoluteSrc) {
				img.attr('src', absoluteSrc);
				return;
			}
		}

		img.remove();
	});

	$('a').each((_, el) => {
		const link = $(el);
		const text = link.text();
		const href = link.attr('href');

		if (text && href) {
			if (href.startsWith('https')) return;
			if (stripRelativeLinks) return void link.remove();

			const { data: absoluteHref } = safeCall(() => new URL(href, baseUrl).href);
			if (absoluteHref) {
				link.attr('href', absoluteHref);
				return;
			}
		}

		link.remove();
	});

	let contentHolder = $('main');
	if (contentHolder.length === 0) contentHolder = $('article');
	if (contentHolder.length === 0) contentHolder = $('body');

	const contentHtml = contentHolder.html();
	if (!contentHtml) return;

	const markdownContent = turndownService.turndown(contentHtml);

	return `
--- METADATA ---
${Object.entries(meta)
	.map(([k, v]) => `- ${k}: ${v}`)
	.join('\n')}

--- PAGE ---
${markdownContent.replace(/\n{2,}/g, '\n').trim()}`;
}

const distillUrl = wrapSafeAsync(
	async (url: string, renderOptions?: RenderOptions, distillOptions?: DistillOptions) => {
		const { data: parsedUrl, success: isValidUrl } = safeCall(() => new URL(url));
		if (!isValidUrl) throw 'Invalid URL';

		const html = await renderUrl(parsedUrl.href, renderOptions);
		if (!html) throw 'Cannot load page';

		const distilled = distillPage(html, parsedUrl.origin, distillOptions);
		if (!distilled) throw 'Cannot read page';

		return distilled;
	},
);

export const generateItemCandidate = wrapSafeAsync(async (url: string) => {
	const { data: page, success, error } = await distillUrl(url);
	if (!success) throw error;

	try {
		const { object: candidate, usage } = await generateObject({
			model: modelHost('mistral-small-latest'),
			schema: CandidateSchema,
			maxRetries: 0,
			messages: [
				{ role: 'system', content: SYSTEM_PROMPT },
				{ role: 'system', content: 'You are to extract only the single best candidate.' },
				{ role: 'user', content: `URL: ${url}` },
				{ role: 'user', content: page },
			],
		});

		reportGenerationUsage(url, usage);

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
	const {
		data: page,
		success,
		error,
	} = await distillUrl(url, { maxScrolls: 3 }, { stripRelativeLinks: false });

	if (!success) throw error;

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
				{ role: 'user', content: page },
			],
		});

		reportGenerationUsage(url, usage);

		return candidates.filter((v) => v.valid);
	} catch (err) {
		console.warn(err);
		if (APICallError.isInstance(err) && err.statusCode === 429) {
			throw 'Generation temporarily unavailable';
		}

		throw 'Generation failed';
	}
});
