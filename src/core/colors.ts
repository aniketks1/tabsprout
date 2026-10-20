import type { ChromeGroupColor } from '../types';

export const CHROME_COLORS: ChromeGroupColor[] = [
  'blue',
  'purple',
  'cyan',
  'green',
  'yellow',
  'pink',
  'red',
  'grey',
];

/**
 * Deterministically pick or cycle a harmonious Chrome tab group color
 */
export function getPaletteColor(index: number): ChromeGroupColor {
  return CHROME_COLORS[index % CHROME_COLORS.length];
}

/**
 * Hash a string (such as domain name) to a consistent color
 */
export function getColorForString(str: string): ChromeGroupColor {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % CHROME_COLORS.length;
  return CHROME_COLORS[index];
}
