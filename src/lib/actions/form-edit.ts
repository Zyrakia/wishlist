import type { Action } from 'svelte/action';

export type FormEditHandler = (
	name: string,
	value: unknown,
	ev: InputEvent & { target: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement },
) => void;

/**
 * When a form field is edited, run a handler with the name and value of
 * the field that was edited.
 */
export const formEdit: Action<HTMLFormElement, FormEditHandler> = (node, handler) => {
	const onInput = (ev: InputEvent) => {
		const control = ev.target;
		if (
			!(
				control instanceof HTMLInputElement ||
				control instanceof HTMLTextAreaElement ||
				control instanceof HTMLSelectElement
			)
		) {
			return;
		}

		const name = control.name;
		handler(name, control.value, ev as typeof ev & { target: typeof control });
	};

	node.addEventListener('input', onInput);
	return {
		destroy() {
			node.removeEventListener('input', onInput);
		},
	};
};
