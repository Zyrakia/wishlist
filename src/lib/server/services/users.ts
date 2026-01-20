import { eq } from 'drizzle-orm';
import { Ok } from 'ts-results';

import { db } from '../db';
import { UserTable } from '../db/schema';
import { createService } from '../util/service';

export const UsersService = createService(db(), {
	/**
	 * Fetches a user by ID.
	 *
	 * @param userId the ID of the user to fetch
	 */
	getById: async (client, userId: string) => {
		const user = await client.query.UserTable.findFirst({
			where: (t, { eq }) => eq(t.id, userId),
		});
		return Ok(user);
	},

	/**
	 * Fetches a user by email address.
	 *
	 * @param email the email address to lookup
	 */
	getByEmail: async (client, email: string) => {
		const user = await client.query.UserTable.findFirst({
			where: (t, { eq }) => eq(t.email, email),
		});
		return Ok(user);
	},

	/**
	 * Creates a new user record.
	 *
	 * @param data the user data to insert
	 */
	create: async (client, data: typeof UserTable.$inferInsert) => {
		await client.insert(UserTable).values(data);
		return Ok(undefined);
	},

	/**
	 * Updates a user's display name.
	 *
	 * @param userId the ID of the user to update
	 * @param name the new display name
	 */
	updateNameById: async (client, userId: string, name: string) => {
		await client.update(UserTable).set({ name }).where(eq(UserTable.id, userId));
		return Ok(undefined);
	},

	/**
	 * Updates a user's password hash.
	 *
	 * @param userId the ID of the user to update
	 * @param passwordHash the new hashed password
	 */
	updatePasswordById: async (client, userId: string, passwordHash: string) => {
		await client
			.update(UserTable)
			.set({ password: passwordHash })
			.where(eq(UserTable.id, userId));
		return Ok(undefined);
	},

	/**
	 * Updates a user's email address.
	 *
	 * @param userId the ID of the user to update
	 * @param email the new email address
	 */
	updateEmailById: async (client, userId: string, email: string) => {
		await client.update(UserTable).set({ email }).where(eq(UserTable.id, userId));
		return Ok(undefined);
	},
});
