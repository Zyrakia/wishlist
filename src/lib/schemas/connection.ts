import z from 'zod';

import { RequiredUrlSchema } from './item';

export const WishlistConnectionSchema = z.object({
	name: z.string().trim().min(3, 'Minimum 3 characters').max(24, 'Maximum 24 characters'),
	url: RequiredUrlSchema,
	provider: z.string().trim().toLowerCase(),
});

export type WishlistConnection = z.infer<typeof WishlistConnectionSchema>;
