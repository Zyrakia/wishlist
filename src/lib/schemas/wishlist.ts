import z from 'zod';

export const WishlistSchema = z.object({
	name: z.string().trim().min(3, 'Minimum 3 characters').max(24, 'Maximum 24 characters'),
	description: z.string().trim().default(''),
	slug: z
		.string()
		.trim()
		.toLowerCase()
		.min(3, 'Minimum 3 characters')
		.max(24, 'Maximum 24 characters')
		.regex(/^[A-Za-z0-9]+$/, { error: 'Only letters and numbers' }),
});

export type Wishlist = z.infer<typeof WishlistSchema>;
