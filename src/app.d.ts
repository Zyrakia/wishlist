import type { AppError } from '$lib/schemas/error';

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
			meta?: { [K in CommonMetaKeys | (string & {})]?: string };
			showHeader?: boolean;
			listHeaderBadge?: string[];
		}

		interface Error extends AppError {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
