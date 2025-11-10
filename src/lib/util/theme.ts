const ThemeTokens = {
	background: 'bg',
	surface: 'surface',
	muted: 'muted',
	border: 'border',
	borderStrong: 'border-strong',
	text: 'text',
	textMuted: 'text-muted',
	accentContrast: 'accent-fg',
	brand: 'accent',
	primary: 'primary',
	success: 'success',
	warning: 'warning',
	danger: 'danger',
} as const;

export type ThemeTokens = typeof ThemeTokens;

export const ValidThemes = ['dark', 'light'] as const;
export type Theme = (typeof ValidThemes)[number];

export const DefaultTheme: Theme = 'light';
