import { eq } from 'drizzle-orm';
import { db } from '../db';
import { UserTable } from '../db/schema';
import { createClientService } from '../util/client-service';

export const UsersService = createClientService(db(), {
	/**
	 * Fetches a user by ID.
	 *
	 * @param userId the ID of the user to fetch
	 */
	getById: async (client, userId: string) => {
		return await client.query.UserTable.findFirst({
			where: (t, { eq }) => eq(t.id, userId),
		});
	},

	/**
	 * Fetches a user by email address.
	 *
	 * @param email the email address to lookup
	 */
	getByEmail: async (client, email: string) => {
		return await client.query.UserTable.findFirst({
			where: (t, { eq }) => eq(t.email, email),
		});
	},

	/**
	 * Creates a new user record.
	 *
	 * @param data the user data to insert
	 */
	createUser: async (client, data: typeof UserTable.$inferInsert) => {
		await client.insert(UserTable).values(data);
	},

	/**
	 * Updates a user's display name.
	 *
	 * @param userId the ID of the user to update
	 * @param name the new display name
	 */
	updateName: async (client, userId: string, name: string) => {
		await client.update(UserTable).set({ name }).where(eq(UserTable.id, userId));
	},

	/**
	 * Updates a user's password hash.
	 *
	 * @param userId the ID of the user to update
	 * @param passwordHash the new hashed password
	 */
	updatePassword: async (client, userId: string, passwordHash: string) => {
		await client
			.update(UserTable)
			.set({ password: passwordHash })
			.where(eq(UserTable.id, userId));
	},

	/**
	 * Updates a user's email address.
	 *
	 * @param userId the ID of the user to update
	 * @param email the new email address
	 */
	updateEmail: async (client, userId: string, email: string) => {
		await client.update(UserTable).set({ email }).where(eq(UserTable.id, userId));
	},
});
