import { dev } from '$app/environment';
import { chromium, type Browser, type BrowserContextOptions, type Page } from 'playwright';

import { getPublicProxyUrl } from '../util/public-proxy';

export type BrowserPriority = 'interactive' | 'background';

type Job = () => Promise<void>;

const queues: Record<BrowserPriority, Job[]> = { interactive: [], background: [] };
const nextJob = () => queues.interactive.shift() ?? queues.background.shift();

let browser: Browser | undefined;
let draining = false;

const getBrowser = async () => {
	if (!browser?.isConnected()) {
		browser = await chromium.launch({
			headless: !dev,
			proxy: { server: await getPublicProxyUrl() },
		});
	}

	return browser;
};

const drain = async () => {
	if (draining) return;
	draining = true;

	while (true) {
		for (let job = nextJob(); job; job = nextJob()) await job();

		await browser?.close().catch(() => {});
		browser = undefined;

		if (!queues.interactive.length && !queues.background.length) break;
	}

	draining = false;
};

/**
 * Runs a task with a fresh page in the shared headless browser. Tasks run one at a time,
 * interactive ones first, and the browser stays open only while tasks are waiting.
 *
 * @param task the task to run with the page, its context is closed afterwards
 * @param options the queue priority and the options for the page's browser context
 */
export const withBrowserPage = <T>(
	task: (page: Page) => Promise<T>,
	{
		priority = 'background',
		context: contextOptions,
	}: { priority?: BrowserPriority; context?: BrowserContextOptions } = {},
) => {
	return new Promise<T>((resolve, reject) => {
		queues[priority].push(async () => {
			const context = await getBrowser()
				.then((b) => b.newContext(contextOptions))
				.catch((err) => void reject(err));
			if (!context) return;

			try {
				resolve(await task(await context.newPage()));
			} catch (err) {
				reject(err);
			} finally {
				await context.close().catch(() => {});
			}
		});

		void drain();
	});
};
