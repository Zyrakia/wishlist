type Ok<T> = { success: true; data: T; error?: never };
type Err = { success: false; error: unknown; data?: never };

export type Result<T> = Ok<T> | Err;

/**
 * Executes a function and wraps the result in a Result.
 *
 * @param fn the function to execute
 */
export const safeCall = <T>(fn: () => T): Result<T> => {
	try {
		const res = fn();
		return { success: true, data: res };
	} catch (err) {
		return { success: false, error: err };
	}
};

/**
 * Executes an async function and wraps the result in a Result.
 *
 * @param fn the async function to execute
 */
export const safeCallAsync = async <T>(fn: () => Promise<T>): Promise<Result<T>> => {
	try {
		const res = await fn();
		return { success: true, data: res };
	} catch (err) {
		return { success: false, error: err };
	}
};

/**
 * Unwraps a Result, throwing on errors.
 *
 * @param result the result to unwrap
 */
export const unwrap = <T>(result: Result<T>): T => {
	if (result.success) return result.data;
	throw result.error;
};

/**
 * Wraps a function to return a Result.
 *
 * @param fn the function to wrap
 */
export const wrapSafe = <A extends unknown[], R>(
	fn: (...args: A) => R,
): ((...args: A) => Result<R>) => {
	return (...args: A) => {
		return safeCall(() => fn(...args));
	};
};

/**
 * Wraps an async function to return a Result.
 *
 * @param fn the async function to wrap
 */
export const wrapSafeAsync = <A extends unknown[], R>(
	fn: (...args: A) => Promise<R>,
): ((...args: A) => Promise<Result<R>>) => {
	return async (...args: A) => {
		return await safeCallAsync(() => fn(...args));
	};
};
