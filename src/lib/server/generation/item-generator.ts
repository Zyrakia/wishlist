import { APICallError, generateObject } from 'ai';
import { load as cheerio } from 'cheerio';
import { chromium, devices, type Page } from 'playwright';
import z from 'zod';

import { createMistral } from '@ai-sdk/mistral';

import ENV from '../env.server';
import { safeCall, wrapSafeAsync } from '$lib/util/safe-call';
import TurndownService from 'turndown';
import { reportGenerationUsage } from './usage-stats';

import SYSTEM_PROMPT from '$lib/assets/generation-system-prompt.txt?raw';
import type { Geolocation } from '../util/geolocation';
import { dev } from '$app/environment';

const modelHost = createMistral({ apiKey: ENV.MISTRAL_AI_KEY });

const CandidateSchema = z.object({
	valid: z.boolean(),
	name: z.string().optional(),
	imageUrl: z.string().optional().nullish(),
	price: z.number().optional().nullish(),
	priceCurrency: z.string().length(3).toUpperCase().optional().nullish(),
	url: z.url().optional().nullish(),
});

interface RenderOptions {
	maxScrolls?: number;
	geolocation?: Geolocation;
}

interface DistillOptions {
	stripRelativeLinks?: boolean;
}

async function scrollToBottom(page: Page, maxScrolls: number) {
	let lastHeight = await page.evaluate(() => document.body.scrollHeight);

	for (let i = 0; i < maxScrolls; i++) {
		await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

		await page.waitForLoadState('networkidle');
		await page.waitForTimeout(1000);

		const newHeight = await page.evaluate(() => document.body.scrollHeight);
		if (newHeight === lastHeight) break;

		lastHeight = newHeight;
	}
}

async function renderUrl(url: string, { maxScrolls, geolocation }: RenderOptions = {}) {
	const browser = await chromium.launch({ headless: !dev });
	const page = await browser.newPage({
		locale: 'en-US',
		timezoneId: geolocation?.timezone ? geolocation.timezone : 'America/New_York',
		extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' },
		...devices['iPhone 15 Pro Max'],
		geolocation: geolocation
			? { latitude: geolocation.latitude, longitude: geolocation.longitude }
			: undefined,
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

export const generateItemCandidate = wrapSafeAsync(async (url: string, from?: Geolocation) => {
	const { data: page, success, error } = await distillUrl(url, { geolocation: from });
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
		} else if (typeof err === 'string') throw err;
		else throw 'Generation failed';
	}
});

export const generateItemCandidates = wrapSafeAsync(async (url: string, from?: Geolocation) => {
	const {
		data: page,
		success,
		error,
	} = await distillUrl(url, { maxScrolls: 5, geolocation: from }, { stripRelativeLinks: false });

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
		} else if (typeof err === 'string') throw err;
		else throw 'Generation failed';
	}
});
