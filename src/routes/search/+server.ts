import { PromptSchema } from '$lib/schemas/search';
import { verifyAuth } from '$lib/server/auth';
import { SearchService } from '$lib/server/services/search';
import { unwrapOrDomain } from '$lib/server/util/service';
import { error, type RequestHandler } from '@sveltejs/kit';
import z from 'zod';

export const POST: RequestHandler = async ({ request }) => {
	verifyAuth();

	const { success, data: body } = z
		.object({ prompt: PromptSchema })
		.safeParse(await request.json());

	if (!success) {
		error(400, {
			message: 'Invalid question provided',
			userMessage:
				"I don't know what kind of question that is, but I don't seem to understand it...",
		});
	}

	const stream = unwrapOrDomain(await SearchService.streamDocsAnswer(body.prompt), (message) =>
		error(404, { message: 'Search failed', userMessage: message }),
	);

	request.signal.addEventListener('abort', async () => {
		await stream.consumeStream();
	});

	return stream.toTextStreamResponse({
		headers: {
			'Transfer-Encoding': 'chunked',
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			'Connection': 'keep-alive',
		},
	});
};
