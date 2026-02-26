import { PromptSchema } from '$lib/schemas/search';
import { verifyAuth } from '$lib/server/auth';
import { SearchService } from '$lib/server/services/search/search';
import { DomainError, unwrap } from '$lib/server/util/service';
import { firstIssue } from '$lib/util/issue';
import { type RequestHandler } from '@sveltejs/kit';
import z from 'zod';

export const POST: RequestHandler = async ({ request }) => {
	verifyAuth({ failStrategy: 'error' });

	let rawBody;
	try {
		rawBody = await request.json();
	} catch {
		return new Response('Malformed request body', {
			status: 400,
			headers: {
				'Content-Type': 'text/plain; charset=utf-8',
				'Cache-Control': 'no-cache',
			},
		});
	}

	const {
		success,
		error: parseError,
		data: body,
	} = z.object({ prompt: PromptSchema }).safeParse(rawBody);

	if (!success) {
		return new Response(firstIssue(parseError.issues), {
			status: 400,
			headers: {
				'Content-Type': 'text/plain; charset=utf-8',
				'Cache-Control': 'no-cache',
			},
		});
	}

	const streamResult = await SearchService.streamDocsAnswer(body.prompt);
	if (streamResult.isErr()) {
		if (DomainError.is(streamResult.error)) {
			return new Response(streamResult.error.message, {
				status: 400,
				headers: {
					'Content-Type': 'text/plain; charset=utf-8',
					'Cache-Control': 'no-cache',
				},
			});
		}

		throw streamResult.error;
	}

	const stream = unwrap(streamResult);

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
