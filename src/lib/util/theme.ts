const ThemeTokens = {
	background: 'bg',
	surface: 'surface',
	muted: 'muted',
	border: 'border',
	text: 'text',
	mutedText: 'text-muted',
	primary: 'primary',
	primaryContrast: 'primary-fg',
	success: 'success',
	warning: 'warning',
	danger: 'danger',
} as const;

export type ThemeTokens = typeof ThemeTokens;

const tokenToVariable = (token: keyof ThemeTokens, as: 'color' = 'color') => {
	return `--${as}-${ThemeTokens[token]}`;
};
