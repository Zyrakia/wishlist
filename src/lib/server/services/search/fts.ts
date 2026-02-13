import { db } from '$lib/server/db';
import { createService, unwrap } from '$lib/server/util/service';
import { Ok } from 'ts-results-es';
import { GroupsService } from '../groups';
import type { SearchResults } from '$lib/schemas/search';
import { sql } from 'drizzle-orm';
import { GroupMembershipTable, GroupTable, WishlistTable } from '$lib/server/db/schema';

const LIMIT = 10;

export const FtsService = createService(db(), {
	createPrefixQuery: (_, prefix: string) => {
		const sanitized = prefix.trim().replace(/"/g, '');
		return Ok(`"${sanitized}"*`);
	},

	findMutualsAsUser: async (client, userId: string, ftsQuery: string) => {
		const groups = unwrap(await GroupsService.$with(client).listByUserId(userId));
		if (groups.length === 0) return Ok([]);

		const groupIds = groups.map((v) => v.groupId);

		const t = sql`group_membership_fts`;
		const rank = sql`MIN(${t}.rank)`;

		type Result = SearchResults['mutual'];
		const result = await client.all<Result>(sql`
            SELECT ${t}.name, ${t}.user_id as userId
            FROM ${t}
            WHERE ${t}.group_id IN ${groupIds}
                AND ${t} MATCH ${ftsQuery}
            GROUP BY ${t}.user_id
            ORDER BY ${rank}
            LIMIT ${LIMIT}`);

		return Ok(result.filter((v) => v.userId !== userId));
	},

	findReservationsAsUser: async (client, userId: string, ftsQuery: string) => {
		const t = sql`reservation_fts`;
		const rank = sql`${t}.rank`;

		type Result = SearchResults['reservation'];
		const result = await client.all<Result>(sql`
            SELECT ${t}.name, ${t}.notes, ${t}.item_id as itemId, ${t}.owner_name as ownerName, wishlist.slug as wishlistSlug
            FROM ${t}
            INNER JOIN ${WishlistTable} as wishlist ON wishlist.id = ${t}.wishlist_id
            WHERE ${t}.reserver_id = ${userId}
                AND ${t} MATCH ${ftsQuery}
            ORDER BY ${rank}
            LIMIT ${LIMIT}`);

		return Ok(result);
	},

	findListsAsUser: async (client, userId: string, ftsQuery: string) => {
		const t = sql`list_fts`;
		const rank = sql`${t}.rank`;

		type Result = SearchResults['list'];
		const result = await client.all<Result>(sql`
            SELECT ${t}.name, ${t}.description, wishlist.slug
            FROM ${t}
            INNER JOIN ${WishlistTable} as wishlist ON wishlist.rowid = ${t}.rowid
	        WHERE wishlist.user_id = ${userId}
                AND ${t} MATCH ${ftsQuery}
            ORDER BY ${rank}
            LIMIT ${LIMIT}`);

		return Ok(result);
	},

	findGroupsAsUser: async (client, userId: string, ftsQuery: string) => {
		const t = sql`group_fts`;
		const rank = sql`${t}.rank`;

		type Result = SearchResults['group'];
		const result = await client.all<Result>(sql`
            SELECT ${t}.name, "group".id
            FROM ${t}
            INNER JOIN ${GroupTable} as "group" ON "group".rowid = ${t}.rowid
            INNER JOIN ${GroupMembershipTable} as membership 
            ON membership.group_id = "group".id
                AND membership.user_id = ${userId}
            WHERE ${t} MATCH ${ftsQuery}
            ORDER BY ${rank}
            LIMIT ${LIMIT}`);

		return Ok(result);
	},
});
