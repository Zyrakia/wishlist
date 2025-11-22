import flow from 'dotenv-flow';
import ms from 'ms';
import z from 'zod';

import { createEnv } from '@t3-oss/env-core';

const { error } = flow.config();
if (error) console.warn(error);

const transformTime = (v: string, ctx: z.RefinementCtx) => {
	const milliseconds = ms(v as ms.StringValue);
	if (isNaN(milliseconds)) {
		ctx.addIssue({
			code: 'custom',
			message: 'Not a valid time string or milliseconds value',
			input: v,
		});

		return z.NEVER;
	}

	return { milliseconds, seconds: milliseconds / 1000, formatted: ms(milliseconds) };
};

const ENV = createEnv({
	runtimeEnv: process.env,
	emptyStringAsUndefined: true,
	clientPrefix: 'VITE_',
	client: {},
	server: {
		MISTRAL_AI_KEY: z.string(),
		DATABASE_PATH: z.string(),
		JWT_SECRET: z.string(),
		JWT_LIFETIME: z.string().default('7d').transform(transformTime),
		JWT_MAX_LIFETIME: z.string().default('30d').transform(transformTime),
		SALT_ROUNDS: z.coerce.number().min(1).default(12),
		RESEND_KEY: z.string(),
		EMAIL_FROM: z.string(),
	},
});

export default ENV;
