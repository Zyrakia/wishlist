import { drizzle } from 'drizzle-orm/libsql';

import { createClient } from '@libsql/client/node';

import * as schema from './schema';
import ENV from '$lib/env';
import { existsSync } from 'node:fs';

const create = () => {
	const dbPath = ENV.DATABASE_PATH;

	// Render build env doesn't have disk access
	if (!existsSync(dbPath.replace('file:', '')) && process.env.RENDER === 'true') {
		console.warn('! USING IN MEMORY DATABASE !');

		const client = createClient({ url: ':memory:' });
		return drizzle(client, { schema, casing: 'snake_case' });
	}

	const client = createClient({ url: ENV.DATABASE_PATH });
	return drizzle(client, { schema, casing: 'snake_case' });
};

export type DatabaseClient = Omit<ReturnType<typeof create>, '$client' | 'batch'>;

let _db: DatabaseClient | null = null;
export const db = () => {
	if (_db) return _db;
	_db = create();
	return _db;
};
