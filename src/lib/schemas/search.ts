import z from 'zod';

export const PromptSchema = z
	.string({ error: 'Prompt is required' })
	.trim()
	.toLowerCase()
	.min(1, { error: 'Minimum 1 character' })
	.max(512, {error: "Maximum 512 characters!"});
