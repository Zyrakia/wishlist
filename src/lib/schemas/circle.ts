import z from 'zod';

export const CircleSchema = z.object({
	name: z
		.string({ error: 'Name is required' })
		.trim()
		.nonempty('Name is required')
		.min(2, { error: 'Minimum 2 characters' })
		.max(50, { error: 'Maximmum 50 characters' }),
});

export type Circle = z.infer<typeof CircleSchema>;
