import type { Action } from 'svelte/action';

/**
 * Toggles a class on an element when the document is scrollable.
 */
export const pageScroll: Action<HTMLElement, (element: HTMLElement, pageScrollable: boolean) => void> = (
	node,
	handler,
) => {
	const target = document.scrollingElement || document.documentElement;
	const update = () => {
		if (!target || !node) return;
		const has = target.scrollHeight > target.clientHeight + 1;
		handler(node, has);
	};

	const ro = new ResizeObserver(update);
	ro.observe(target);
	window.addEventListener('resize', update);
	update();

	return {
		destroy() {
			ro.disconnect();
			window.removeEventListener('resize', update);
		},
	};
};
