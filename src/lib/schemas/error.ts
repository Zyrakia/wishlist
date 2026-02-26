import z from 'zod';

export const AppErrorSchema = z.object({
	message: z.string(),
	userMessage: z.string().optional(),
});

export type AppError = z.infer<typeof AppErrorSchema>;
