import { safeCallAsync, wrapSafeAsync, type Result } from '$lib/util/safe-call';

type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;

type Actions<C> = Record<string, (client: C, ...args: any[]) => any>;

type MappedActions<C, A extends Actions<C>> = {
	[K in keyof A]: A[K] extends (c: C, ...args: infer P) => infer R
		? (...args: P) => Promise<Result<UnwrapPromise<R>>>
		: never;
};

type Helpers<C, A extends Actions<C>> = {
	/**
	 * Creates a new service that mirrors the actions of the current service,
	 * but performs all actions on a new client.
	 *
	 * @param client the new client of the service
	 * @return the mirroring service with a new client
	 */
	$with: <C2 extends C>(client: C2) => CService<C2, A>;
};

export type CService<C extends unknown, A extends Actions<C>> = Readonly<MappedActions<C, A>> &
	Helpers<C, A>;

/**
 * Creates a new service with an initial client.
 *
 * @param client the initial client of the service
 * @param actions the actions that the service exposes
 * @return the created service with mapped actions
 */
export function createClientService<C extends unknown, A extends Actions<C>>(
	client: C,
	actions: A,
): CService<C, A> {
	const wrap =
		<Args extends any[], R>(fn: (client: C, ...args: Args) => Promise<R> | R) =>
		(...args: Args) =>
			safeCallAsync(async () => await fn(client, ...args));

	const serviceMethods = Object.fromEntries(
		Object.entries(actions).map(([key, action]) => [key, wrap(action)]),
	) as MappedActions<C, A>;

	return {
		...Object.freeze(serviceMethods),
		$with: <C2 extends C>(newClient: C2) => {
			return createClientService(newClient, actions);
		},
	};
}
