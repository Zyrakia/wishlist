import type { HandleClientError } from '@sveltejs/kit';

export const handleError: HandleClientError = ({ error, event }) => {
	console.error('Client error during navigation', {
		error,
		url: event.url.href,
	});

	return { message: 'Client-side error' };
};
