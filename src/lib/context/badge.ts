import { createContext } from '$lib/context';

export interface BadgeContext {
	addBadge: (id: string, value: string) => void;
	removeBadge: (id: string) => void;
}

export const badgeContext = createContext<BadgeContext>('badge');
