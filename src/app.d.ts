import type { User } from '$lib/server/db/schema';

declare global {
	namespace App {
		interface Locals {
			user?: User;
		}

		// interface Error {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
