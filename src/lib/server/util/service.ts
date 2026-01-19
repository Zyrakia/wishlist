import { $fail, type Result } from '$lib/util/result';

type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;

type Actions<C> = Record<
	string,
	(client: C, ...args: any[]) => Result<unknown> | Promise<Result<unknown>>
>;

type MappedActions<C, A extends Actions<C>> = {
	[K in keyof A]: A[K] extends (c: C, ...args: infer P) => infer R
		? (...args: P) => Promise<UnwrapPromise<R>>
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
	$with: <C2 extends C>(client: C2) => Service<C2, A>;
};

export type Service<C extends unknown, A extends Actions<C>> = Readonly<MappedActions<C, A>> &
	Helpers<C, A>;

/**
 * Creates a new service with an initial client.
 *
 * @param client the initial client of the service
 * @param actions the actions that the service exposes
 * @return the created service with mapped actions
 */
export function createService<C extends unknown, A extends Actions<C>>(
	client: C,
	actions: A,
): Service<C, A> {
	const wrap =
		<Args extends any[], R>(fn: (client: C, ...args: Args) => Result<R> | Promise<Result<R>>) =>
		async (...args: Args): Promise<Result<R>> => {
			try {
				return await fn(client, ...args);
			} catch (error) {
				return $fail(error);
			}
		};

	const serviceMethods = Object.fromEntries(
		Object.entries(actions).map(([key, action]) => [key, wrap(action)]),
	) as MappedActions<C, A>;

	return {
		...Object.freeze(serviceMethods),
		$with: <C2 extends C>(newClient: C2) => {
			return createService(newClient, actions);
		},
	};
}
