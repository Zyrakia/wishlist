export interface DomainValidationDetails {
	GENERIC: unknown;

	CONNECTION_SYNC_DELAY: { nextSync: Date };
	CONNECTION_EMPTY: undefined;

	GENERATION_BAD_URL: { url: string };
	GENERATION_BAD_DISTILL: { url: string };
	GENERATION_BAD_RENDER: { url: string };
	GENERATION_NO_RESULT: undefined;
	GENERATION_UNKNOWN: undefined;
	GENERATION_RATE_LIMIT: undefined;
}

export type ValidationCode = keyof DomainValidationDetails;
export type ValidationDetails<C extends ValidationCode> = DomainValidationDetails[C];
