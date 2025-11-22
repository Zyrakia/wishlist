import { browser } from '$app/environment';
import type { HandleClientError } from '@sveltejs/kit';

if (browser) {
	window.addEventListener('error', (event) => {
		console.error('Global window error', {
			message: event.message,
			source: event.filename,
			lineno: event.lineno,
			colno: event.colno,
			error: event.error,
		});
	});

	window.addEventListener('unhandledrejection', (event) => {
		console.error('Global unhandled promise rejection', {
			reason: event.reason,
		});
	});
}

export const handleError: HandleClientError = ({ error, event }) => {
	console.error('Client error during navigation', {
		error,
		url: event.url.href,
	});

	return { message: 'Client-side error' };
};
