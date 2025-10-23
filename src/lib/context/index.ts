import { getContext, setContext } from 'svelte';

export const createContext = <T>(key: string) => {
	return { get: () => getContext<T>(key), set: (value: T) => setContext(key, value) };
};
