import { form, query } from '$app/server';
import { AdminService } from '$lib/server/services/admin';
import { unwrap } from '$lib/server/util/service';
import { error } from '@sveltejs/kit';
import z from 'zod';

import { checkRole } from './auth.remote';
import { syncListConnection } from '$lib/server/generation/connection-sync';

const verifyAdmin = async () => {
	const isRole = await checkRole({ targetRole: 'ADMIN' });
	if (!isRole) error(401, 'You do not have permission to access this resource');
};

export const listUsers = query(
	z.object({
		limit: z.number().min(10).multipleOf(10).max(100),
		page: z.number().int().min(0),
	}),
	async ({ limit, page }) => {
		await new Promise((res) => setTimeout(res, 2000));

		await verifyAdmin();

		const offset = page * limit;
		return unwrap(await AdminService.listUsersPage(limit, offset));
	},
);

export const listErroredConnections = query(
	z.object({
		limit: z.number().min(10).multipleOf(10).max(100),
		page: z.number().int().min(0),
	}),
	async ({ page, limit }) => {
		await verifyAdmin();

		const offset = page * limit;
		return unwrap(await AdminService.listErroredConnectionsPage(limit, offset));
	},
);

export const forceResync = form(
	z.object({ connectionId: z.string() }),
	async ({ connectionId }) => {
		await syncListConnection(connectionId);
	},
);
