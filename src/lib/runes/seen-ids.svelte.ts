import { browser } from '$app/environment';
import { SvelteMap } from 'svelte/reactivity';
import z from 'zod';

const schema = z.array(z.tuple([z.string(), z.number()]));

const KEY = 'seen-ids';

const loadInitial = () => {
	if (!browser) return [];

	try {
		const raw = localStorage.getItem(KEY);
		if (!raw) return [];

		return schema.parse(JSON.parse(raw));
	} catch {
		return [];
	}
};

const seenIds = new SvelteMap(loadInitial());

$effect.root(() => {
	$effect(() => {
		const iter = seenIds.entries();
		const entries = [];
		for (const entry of iter) entries.push(entry);
		localStorage.setItem(KEY, JSON.stringify(entries));
	});
});

export const markSeen = (id: string) => {
	seenIds.set(id, Date.now());
};

export const clear = () => {
	seenIds.clear();
};

export const hasSeen = (id: string, after?: number) => {
	const seenAt = seenIds.get(id);
	if (seenAt === undefined) return false;
	return after === undefined || seenAt >= after;
};

export const seen = { markSeen, clear, hasSeen };
