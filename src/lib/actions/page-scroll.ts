import type { Action } from 'svelte/action';

/**
 * Toggles a class on an element when the document is scrollable.
 */
export const pageScroll: Action<HTMLElement, { toggleClass: string } | undefined> = (
	node,
	props = { toggleClass: 'has-scroll' },
) => {
	const target = document.scrollingElement || document.documentElement;

	const update = () => {
		const has = target.scrollHeight > target.clientHeight + 1;
		node.classList.toggle(props.toggleClass, has);
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
