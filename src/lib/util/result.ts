import type { ValidationCode, ValidationDetails } from '../domain-validation';

type ValidationResult<C extends ValidationCode> = {
	kind: 'invalid';
	code: C;
	details: ValidationDetails<C>;
};

export type Result<T> =
	| { kind: 'success'; data: T }
	| { kind: 'error'; error: unknown }
	| ValidationResult<ValidationCode>;

export const $ok: {
	(): Result<undefined>;
	<T>(data: T): Result<T>;
} = <T>(data?: T): Result<T> => ({ kind: 'success', data: data as T });

export const $fail = <T = never>(error: unknown): Result<T> => ({ kind: 'error', error });

export const $invalid = <C extends ValidationCode>(
	code: C,
	details: ValidationDetails<C>,
): Result<never> => {
	return { kind: 'invalid', code, details };
};

export const $switchInvalid = <R>(
	result: ValidationResult<ValidationCode>,
	handlers: { [K in ValidationCode]?: (details: ValidationDetails<K>) => R },
) => {
	const { code, details } = result;
	if (!(code in handlers))
		throw new Error(`Unhandled invalid result: ${code}`, { cause: result });

	return handlers[code]!(details as never);
};

export const $unwrap = <T>(result: Result<T>) => {
	if (result.kind === 'success') return result.data;
	else if (result.kind === 'error') throw result.error;
	else throw new Error(result.code, { cause: result.details });
};

export const $unwrapOr = <T>(result: Result<T>, defaultValue: T) => {
	return result.kind === 'success' ? result.data : defaultValue;
};

export const $safeCall = <T>(fn: () => T): Result<T> => {
	try {
		return $ok(fn());
	} catch (err) {
		return $fail(err);
	}
};

export const $safeCallAsync = async <T>(fn: () => Promise<T>): Promise<Result<T>> => {
	try {
		return $ok(await fn());
	} catch (err) {
		return $fail(err);
	}
};

export const $wrapSafe = <A extends unknown[], R>(
	fn: (...args: A) => R,
): ((...args: A) => Result<R>) => {
	return (...args: A) => $safeCall(() => fn(...args));
};

export const $wrapSafeAsync = <A extends unknown[], R>(
	fn: (...args: A) => Promise<R>,
): ((...args: A) => Promise<Result<R>>) => {
	return async (...args: A) => await $safeCallAsync(() => fn(...args));
};
