import { dev } from '$app/environment';
import SYSTEM_PROMPT from '$lib/assets/generation-system-prompt.txt?raw';
import { APICallError, generateObject } from 'ai';
import { load as cheerio } from 'cheerio';
import { chromium, devices, type Page } from 'playwright';
import TurndownService from 'turndown';
import { Err, Ok, Result } from 'ts-results-es';
import z from 'zod';

import { createMistral } from '@ai-sdk/mistral';

import { reportGenerationUsage } from './usage-stats';

import ENV from '$lib/env';
import { DomainError } from '../util/service';

const modelHost = createMistral({ apiKey: ENV.MISTRAL_AI_KEY });

const CandidateSchema = z.object({
	valid: z.boolean(),
	name: z.string().optional(),
	imageUrl: z.string().optional().nullish(),
	price: z.number().optional().nullish(),
	priceCurrency: z.string().length(3).toUpperCase().optional().nullish(),
	url: z.url().optional().nullish(),
});

export type ItemCandidate = z.infer<typeof CandidateSchema>;

interface RenderOptions {
	maxScrolls?: number;
}

interface DistillOptions {
	stripRelativeLinks?: boolean;
}

async function scrollToBottom(page: Page, maxScrolls: number) {
	let lastHeight = await page.evaluate(() => document.body.scrollHeight);

	for (let i = 0; i < maxScrolls; i++) {
		await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

		try {
			await page.waitForLoadState('networkidle', { timeout: 10000 });
		} catch (err) {}
		await page.waitForTimeout(1000);

		const newHeight = await page.evaluate(() => document.body.scrollHeight);
		if (newHeight === lastHeight) break;

		lastHeight = newHeight;
	}
}

async function renderUrl(url: string, { maxScrolls }: RenderOptions = {}) {
	const browser = await chromium.launch({ headless: !dev });

	try {
		const page = await browser.newPage({
			locale: 'en-US',
			timezoneId: 'America/New_York',
			extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' },
			...devices['iPhone 15 Pro Max'],
		});

		const res = await page.goto(url, { waitUntil: 'domcontentloaded' });
		if (!res) {
			console.warn(`Could not goto "${url}"`);
			return;
		} else if (res.status() !== 200) {
			console.warn(`Invalid status while rendering "${url}" (${res.status()})`);
			console.warn('Response Headers:');
			console.warn(res.headers());
			return;
		}

		if (maxScrolls) await scrollToBottom(page, maxScrolls);
		return await page.content();
	} catch (err) {
		console.warn(err);
	} finally {
		await browser.close();
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
			const absoluteSrcResult = Result.wrap(() => new URL(src, baseUrl).href);
			if (absoluteSrcResult.ok) {
				const absoluteSrc = absoluteSrcResult.val;
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

			const absoluteHrefResult = Result.wrap(() => new URL(href, baseUrl).href);
			if (absoluteHrefResult.ok) {
				const absoluteHref = absoluteHrefResult.val;
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

const distillUrl = async (
	url: string,
	renderOptions?: RenderOptions,
	distillOptions?: DistillOptions,
): Promise<Result<string, DomainError>> => {
	const parsedUrlResult = Result.wrap(() => new URL(url));
	if (parsedUrlResult.err) return Err(DomainError.of('Invalid URL'));

	const parsedUrl = parsedUrlResult.val;
	const html = await renderUrl(parsedUrl.href, renderOptions);
	if (!html) return Err(DomainError.of('Cannot render page'));

	const distilled = distillPage(html, parsedUrl.origin, distillOptions);
	if (!distilled) return Err(DomainError.of('Cannot read page'));

	return Ok(distilled);
};

export const generateItemCandidate = async (
	url: string,
): Promise<Result<z.infer<typeof CandidateSchema>, DomainError>> => {
	const pageResult = await distillUrl(url);
	if (pageResult.err) return pageResult;

	const page = pageResult.val;

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

		if (!candidate?.valid) return Err(DomainError.of('No product found'));
		return Ok(candidate);
	} catch (err) {
		console.warn(err);

		if (APICallError.isInstance(err) && err.statusCode === 429) {
			return Err(DomainError.of('Generation temporarily disabled'));
		}
		return Err(DomainError.of('Generation failed'));
	}
};

export const generateItemCandidates = async (
	url: string,
): Promise<Result<z.infer<z.ZodArray<typeof CandidateSchema>>, DomainError>> => {
	const pageResult = await distillUrl(url, { maxScrolls: 5 }, { stripRelativeLinks: false });
	if (pageResult.err) return pageResult;

	const page = pageResult.val;

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

		return Ok(candidates.filter((v) => v.valid));
	} catch (err) {
		console.warn(err);

		if (APICallError.isInstance(err) && err.statusCode === 429) {
			return Err(DomainError.of('Generation temporarily disabled'));
		}

		return Err(DomainError.of('Generation failed'));
	}
};
