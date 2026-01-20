import { Err, Result, OkImpl, ErrImpl } from 'ts-results';

type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;

type ExtractErr<T> = T extends ErrImpl<infer E> ? E : never;
type DefaultErr<T> = [T] extends [never] ? Error : T | Error;
type ExtractOk<T> = T extends OkImpl<infer O> ? O : never;

// Ensure we maintain `Ok` value, override `Err`.
type BoxResult<T> = Result<ExtractOk<T>, DefaultErr<ExtractErr<T>>>;

type Action<C, P extends unknown[], R extends Result<unknown, unknown>> = (
	client: C,
	...args: P
) => R | Promise<R>;
type Actions<C> = Record<string, Action<C, any[], Result<unknown, unknown>>>;

type MappedActions<C, A extends Actions<C>> = {
	[K in keyof A]: (
		...args: Parameters<A[K]> extends [_: unknown, ...infer P] ? P : unknown[]
	) => Promise<BoxResult<UnwrapPromise<ReturnType<A[K]>>>>;
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

export type Service<C, A extends Actions<C>> = Readonly<MappedActions<C, A>> & Helpers<C, A>;

/**
 * Creates a new service with an initial client.
 *
 * @param client the initial client of the service
 * @param actions the actions that the service exposes
 * @return the created service with mapped actions
 */
export function createService<C, A extends Actions<C>>(client: C, actions: A): Service<C, A> {
	function wrap<P extends unknown[], R extends Result<unknown, unknown>>(
		action: Action<C, P, R>,
	) {
		return async (...args: P) => {
			try {
				return (await action(client, ...args)) as BoxResult<UnwrapPromise<R>>;
			} catch (err) {
				if (!DomainError.is(err)) {
					console.warn(err);
				} else if (err instanceof Error) return Err(err);
				else return Error(String(err), { cause: err });
			}
		};
	}

	const serviceMethods = Object.fromEntries(
		Object.entries(actions).map(([key, action]) => [key, wrap(action)]),
	) as unknown as MappedActions<C, A>;

	return Object.freeze({
		...serviceMethods,
		$with: <C2 extends C>(newClient: C2) => {
			return createService(newClient, actions);
		},
	});
}

/**
 * Base error for domain-specific failures within services.
 */
export class DomainError extends Error {
	public constructor(message: string) {
		super(message);
		this.name = this.constructor.name;
	}

	/**
	 * Helper to construct a new domain error.
	 */
	public static of(message: string) {
		return new this(message);
	}

	/**
	 * Type-guard to check if an unknown value is a DomainError.
	 *
	 * @param value anything you want to test
	 */
	public static is(value: unknown): value is DomainError {
		return value instanceof DomainError;
	}
}
