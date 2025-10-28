import type { User } from '$lib/server/db/schema';

declare global {
	namespace App {
		interface Locals {
			user?: {id: string, name: string};
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
