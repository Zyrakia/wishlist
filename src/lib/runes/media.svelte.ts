import { MediaQuery } from 'svelte/reactivity';

export const isMobile = new MediaQuery('(max-width: 768px)');
export const isDesktop = new MediaQuery('(min-width: 769px)');

export const likelyHasKeyboard = new MediaQuery('(hover: hover) and (pointer: fine)');
export const likelyTouchOnly = new MediaQuery('(hover: none) and (pointer: coarse)');
