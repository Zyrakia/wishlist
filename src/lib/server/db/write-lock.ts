import type { Client, InStatement, Transaction, TransactionMode } from '@libsql/client';

const createMutex = () => {
	let tail = Promise.resolve();

	return () => {
		let release!: () => void;
		const held = new Promise<void>((res) => (release = res));
		const acquired = tail.then(() => release);
		tail = tail.then(() => held);
		return acquired;
	};
};

const once = (fn: () => void) => {
	let called = false;
	return () => {
		if (called) return;
		called = true;
		fn();
	};
};

const isRead = (stmt: InStatement) => {
	const sql = typeof stmt === 'string' ? stmt : stmt.sql;
	return /^\s*select\b/i.test(sql);
};

const bindTo = <T extends object>(target: T, prop: string | symbol) => {
	const value = Reflect.get(target, prop, target);
	return typeof value === 'function' ? value.bind(target) : value;
};

const releaseOnEnd = (tx: Transaction, release: () => void): Transaction => {
	const ending = new Set<string | symbol>(['commit', 'rollback', 'close']);

	return new Proxy(tx, {
		get(target, prop) {
			const value = bindTo(target, prop);
			if (!ending.has(prop)) return value;

			return (...args: unknown[]) => {
				try {
					const result = value(...args);
					if (result instanceof Promise) return result.finally(release);
					release();
					return result;
				} catch (err) {
					release();
					throw err;
				}
			};
		},
	});
};

// libSQL runs interactive transactions on a separate connection, so a concurrent write
// fails instantly with SQLITE_BUSY; a busy timeout would block the event loop instead.
export const serializeWrites = (client: Client): Client => {
	const lock = createMutex();

	const locked = async <T>(fn: () => Promise<T>) => {
		const release = await lock();
		try {
			return await fn();
		} finally {
			release();
		}
	};

	return new Proxy(client, {
		get(target, prop) {
			switch (prop) {
				case 'execute': {
					const execute = bindTo(target, prop);
					return (stmt: InStatement, ...rest: unknown[]) => {
						const run = () => execute(stmt, ...rest);
						return isRead(stmt) ? run() : locked(run);
					};
				}
				case 'batch':
				case 'migrate':
				case 'executeMultiple': {
					const method = bindTo(target, prop);
					return (...args: unknown[]) => locked(() => method(...args));
				}
				case 'transaction':
					return async (mode?: TransactionMode) => {
						if (mode === 'read') return target.transaction(mode);

						const release = once(await lock());
						try {
							return releaseOnEnd(await target.transaction(mode), release);
						} catch (err) {
							release();
							throw err;
						}
					};
				default:
					return bindTo(target, prop);
			}
		},
	});
};
