import { QuestionSchema } from '$lib/schemas/search';
import { verifyAuth } from '$lib/server/auth';
import { SearchService } from '$lib/server/services/search';
import { unwrapOrDomain } from '$lib/server/util/service';
import { error, type RequestHandler } from '@sveltejs/kit';
import z from 'zod';

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = verifyAuth();

	const { success, data: body } = z
		.object({
			question: QuestionSchema,
			currentPath: z.string().trim().startsWith('/').min(1).max(255).optional(),
		})
		.safeParse(await request.json());

	if (!success) {
		error(400, {
			message: 'Invalid question provided',
			userMessage:
				"I don't know what kind of question that is, but I don't seem to understand it...",
		});
	}

	const addonContext: string[] = [];
	addonContext.push(`Logged in: ${locals.user !== undefined ? 'Yes' : 'No'}`);
	if (body.currentPath) addonContext.push(`Asking from page: ${body.currentPath}`);
	if (locals.user?.name) addonContext.push(`My name: ${user.name}`);

	const stream = unwrapOrDomain(
		await SearchService.streamDocsAnswer(body.question, addonContext),
		(message) => error(404, { message: 'Search failed', userMessage: message }),
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
