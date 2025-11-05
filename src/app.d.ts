import type { User } from '$lib/server/db/schema';

type CommonMetaKeys =
	| 'title'
	| 'description'
	| 'author'
	| 'canonical'
	| 'og:title'
	| 'og:description'
	| 'og:type'
	| 'og:image'
	| 'og:url'
	| 'twitter:card'
	| 'twitter:title'
	| 'twitter:description'
	| 'twitter:image';

declare global {
	namespace App {
		interface Locals {
			user?: { id: string; name: string };
		}

		interface PageData {
			headerBadges?: string[];
			meta?: { [K in CommonMetaKeys | (string & {})]?: string };
		}

		// interface Error {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
