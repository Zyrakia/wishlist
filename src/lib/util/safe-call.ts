type Result<T> = { data: T; error: null } | { data: null; error: unknown };

export const safeCall = <T>(fn: () => T): Result<T> => {
	try {
		const res = fn();
		return { data: res, error: null };
	} catch (err) {
		return { data: null, error: err };
	}
};
