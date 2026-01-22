import { QuestionSchema } from '$lib/schemas/search';
import { streamDocumentationAnswer } from '$lib/server/docs-search';
import { error, type RequestHandler } from '@sveltejs/kit';
import z from 'zod';

export const POST: RequestHandler = async ({ request, locals }) => {
	const { success, data: body } = z
		.object({ question: QuestionSchema })
		.safeParse(await request.json());
	if (!success) {
		error(400, {
			message: 'Invalid question provided',
			userMessage:
				"I don't know what kind of question that is, but I don't seem to understand it...",
		});
	}

	const addonContext: string[] = [];
	if (locals.user?.name) addonContext.push(`User name: ${locals.user.name}`);

	const stream = await streamDocumentationAnswer(body.question, addonContext);
	if (!stream) {
		error(404, {
			message: 'No documentation on topic',
			userMessage:
				"Hmm... I didn't find information about your question, can you try rewording it?",
		});
	}

	request.signal.addEventListener('abort', async () => {
		await stream.consumeStream();
	});

	return stream.toTextStreamResponse({
		headers: {
			'Transfer-Encoding': 'chuncked',
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			'Connection': 'keep-alive',
		},
	});
};
