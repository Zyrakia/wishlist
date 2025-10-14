import { createEnv } from '@t3-oss/env-core';

const ENV = createEnv({
	runtimeEnv: import.meta.env,
	emptyStringAsUndefined: true,
	clientPrefix: 'VITE_',
	client: {},
});

export default ENV;
