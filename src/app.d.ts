import type { User } from '$lib/server/db/schema';

declare global {
	namespace App {
		interface Locals {
			user?: User;
		}

		interface PageData {
			headerBadges?: string[];
		}

		// interface Error {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
