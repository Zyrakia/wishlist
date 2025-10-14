import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import ENV from '../env.server';

const client = new Database(ENV.DATABASE_URL);

export const db = drizzle(client, { schema, casing: 'snake_case' });
