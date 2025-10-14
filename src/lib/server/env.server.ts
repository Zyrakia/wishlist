import { createEnv } from '@t3-oss/env-core';
import z from 'zod';

import flow from 'dotenv-flow';
const { error } = flow.config();
if (error) throw error;

const ENV = createEnv({
	runtimeEnv: process.env,
	emptyStringAsUndefined: true,
	clientPrefix: 'VITE_',
	client: {},
	server: {
		DATABASE_URL: z.string(),
	},
});

export default ENV;
