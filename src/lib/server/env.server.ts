import { createEnv } from '@t3-oss/env-core';
import z from 'zod';

import flow from 'dotenv-flow';
import ms from 'ms';
const { error } = flow.config();
if (error) throw error;

const ENV = createEnv({
	runtimeEnv: process.env,
	emptyStringAsUndefined: true,
	clientPrefix: 'VITE_',
	client: {},
	server: {
		GOOGLE_AI_KEY: z.string(),
		DATABASE_URL: z.string(),
		JWT_SECRET: z.string(),
		JWT_LIFETIME: z
			.string()
			.default('24h')
			.transform((v, ctx) => {
				const milliseconds = ms(v as ms.StringValue);
				if (isNaN(milliseconds)) {
					ctx.addIssue({
						code: 'custom',
						message: 'Not a valid time string or milliseconds value',
						input: v,
						path: ['JWT_LIFETIME'],
					});

					return z.NEVER;
				}

				return { seconds: milliseconds / 1000, formatted: ms(milliseconds) };
			}),
		SALT_ROUNDS: z.coerce.number().min(1).default(12),
	},
});

export default ENV;
