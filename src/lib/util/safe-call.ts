export type Result<T> =
	| { success: true; data: T; error?: never }
	| { success: false; data?: never; error: unknown };

export const safeCall = <T>(fn: () => T): Result<T> => {
	try {
		const res = fn();
		return { success: true, data: res };
	} catch (err) {
		return { success: false, error: err };
	}
};

export const safeCallAsync = async <T>(fn: () => Promise<T>): Promise<Result<T>> => {
	try {
		const res = await fn();
		return { success: true, data: res };
	} catch (err) {
		return { success: false, error: err };
	}
};

export const wrapSafe = <A extends unknown[], R>(
	fn: (...args: A) => R,
): ((...args: A) => Result<R>) => {
	return (...args: A) => {
		return safeCall(() => fn(...args));
	};
};

export const wrapSafeAsync = <A extends unknown[], R>(
	fn: (...args: A) => Promise<R>,
): ((...args: A) => Promise<Result<R>>) => {
	return async (...args: A) => {
		return await safeCallAsync(() => fn(...args));
	};
};
