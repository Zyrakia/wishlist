const rtf = new Intl.RelativeTimeFormat(navigator.languages, { numeric: 'auto' });

const units = [
	['year', 1000 * 60 * 60 * 24 * 365],
	['month', 1000 * 60 * 60 * 24 * 30],
	['day', 1000 * 60 * 60 * 24],
	['hour', 1000 * 60 * 60],
	['minute', 1000 * 60],
	['second', 1000],
] as const;

/**
 * Given two dates, formats the first relative to the other.
 *
 * Format units: `year, month, day, hour, minute, second`
 * Exmaple:
 * ```
 * const expiresAt = new Date()
 * expiresAt.setTime(expiresAt.getTime() + ms('10m'))
 * formatRelative(expiresAt, new Date()) // in 10 minutes
 * ```
 *
 * @param date the date to format
 * @param relativeTo the date in the future or in the past that it should be relative to
 * @return the formatted string
 */
export function formatRelative(date: Date, relativeTo: Date = new Date()) {
	const diff = date.getTime() - relativeTo.getTime();

	for (const [unit, ms] of units) {
		const value = Math.trunc(diff / ms);
		if (Math.abs(value) >= 1) return rtf.format(value, unit);
	}

	return 'now';
}
