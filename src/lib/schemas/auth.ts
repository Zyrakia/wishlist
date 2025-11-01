import z from 'zod';

export const CredentialsSchema = z.object({
	email: z.email({ error: 'Invalid email' }).toLowerCase().trim().nonempty('Email is required'),
	username: z.string({ error: 'Username is required' }).trim().nonempty({ error: 'Username is required' }),
	password: z.string({ error: 'Password is required' }).nonempty({ error: 'Password is required' }),
});

export const CreateCredentialsSchema = CredentialsSchema.extend({
	username: CredentialsSchema.shape.username
		.min(3, { error: 'minimum 3 characters' })
		.max(24, { error: 'maximum 24 characters' }),
	password: CredentialsSchema.shape.password
		.min(11, { error: 'Minimum 11 characters' })
		.max(128, { error: 'Maximum 128 characters' }),
	passwordConfirm: z.string({ error: 'Password must be confirmed' }),
}).superRefine(({ password, passwordConfirm }, ctx) => {
	if (password !== passwordConfirm) {
		ctx.addIssue({
			code: 'custom',
			message: 'Passwords must match',
			path: ['passwordConfirm'],
		});
	}
});
