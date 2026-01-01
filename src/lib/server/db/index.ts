import { drizzle } from 'drizzle-orm/libsql';

import { createClient } from '@libsql/client/node';

import * as schema from './schema';
import ENV from '$lib/env';

const create = () => {
	const client = createClient({ url: ENV.DATABASE_PATH });
	return drizzle(client, { schema, casing: 'snake_case' });
};

let _db: ReturnType<typeof create> | null = null;
export const db = () => {
	if (_db) return _db;
	_db = create();
	return _db;
};
