import z from 'zod';

export const QuestionSchema = z
	.string({ error: 'Question is required' })
	.trim()
	.toLowerCase()
	.min(1, { error: 'Question is required' })
	.max(255);
