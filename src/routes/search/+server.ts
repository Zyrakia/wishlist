import { PromptSchema } from '$lib/schemas/search';
import { verifyAuth } from '$lib/server/auth';
import { SearchService } from '$lib/server/services/search/search';
import { DomainError, unwrap } from '$lib/server/util/service';
import { firstIssue } from '$lib/util/issue';
import { type RequestHandler } from '@sveltejs/kit';
import z from 'zod';

const abortOnCancel = (body: ReadableStream<Uint8Array>, controller: AbortController) => {
	const reader = body.getReader();

	return new ReadableStream<Uint8Array>({
		async pull(out) {
			const { done, value } = await reader.read();
			if (done) out.close();
			else out.enqueue(value);
		},
		cancel(reason) {
			controller.abort(reason);
			return reader.cancel(reason);
		},
	});
};

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

	const generation = new AbortController();
	const streamResult = await SearchService.streamDocsAnswer(body.prompt, generation.signal);
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

	const response = unwrap(streamResult).toTextStreamResponse({
		headers: {
			'Transfer-Encoding': 'chunked',
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			'Connection': 'keep-alive',
		},
	});

	// SvelteKit cancels the body when the client disconnects; request.signal no longer fires
	// once the request body has been read
	return new Response(abortOnCancel(response.body!, generation), response);
};
