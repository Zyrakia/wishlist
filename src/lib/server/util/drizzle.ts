import { getTableColumns, sql, SQL } from 'drizzle-orm';

import type { SQLiteTable } from 'drizzle-orm/sqlite-core';

/**
 * Maps the specified columns into a record specifying
 * the `set` value during an `upsert`.
 *
 * Column names are automatically `snake_cased`.
 */
export const buildUpsertSet = <T extends SQLiteTable>(
	table: T,
	...pick: (keyof T['_']['columns'])[]
) => {
	const columns = getTableColumns(table);
	const updateSet: { [K in keyof T['_']['columns']]?: SQL } = {};

	for (const key of pick) {
		const column = columns[key];
		const colName =
			column.name === key ? key.replace(/[A-Z]/g, (x) => `_${x.toLowerCase()}`) : column.name;
		updateSet[key] = sql.raw(`excluded.${colName}`);
	}

	return updateSet;
};
