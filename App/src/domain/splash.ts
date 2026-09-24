import type { ISODate } from './types';

/**
 * The intro splash: when it shows, which message it shows and which emojis it cycles through.
 * The messages themselves live in texts.ts; this file only picks indexes.
 */

/** Launches that always show the splash, before it drops to once a day. */
export const SPLASH_FIRST_LAUNCHES = 5;
/** Emojis cycled per showing, each shown for SPLASH_EMOJI_MS. */
export const SPLASH_EMOJI_COUNT = 5;
export const SPLASH_EMOJI_MS = 1000;

export interface SplashState {
  /** Automatic showings so far (a replay from the menu does not count). */
  shownCount: number;
  lastShownDate: ISODate | null;
}

export function initialSplashState(): SplashState {
  return { shownCount: 0, lastShownDate: null };
}

/** Reads a stored state defensively; anything unexpected counts as never shown. */
export function parseSplashState(raw: unknown): SplashState {
  if (typeof raw !== 'object' || raw === null) return initialSplashState();
  const { shownCount, lastShownDate } = raw as Record<string, unknown>;
  return {
    shownCount: typeof shownCount === 'number' && Number.isInteger(shownCount) && shownCount >= 0 ? shownCount : 0,
    lastShownDate: typeof lastShownDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(lastShownDate) ? lastShownDate : null,
  };
}

/** The first SPLASH_FIRST_LAUNCHES launches, then the first launch of each day. */
export function shouldShowSplash(state: SplashState, today: ISODate): boolean {
  return state.shownCount < SPLASH_FIRST_LAUNCHES || state.lastShownDate !== today;
}

export function recordSplashShown(state: SplashState, today: ISODate): SplashState {
  return { shownCount: state.shownCount + 1, lastShownDate: today };
}

/** Message for an automatic showing: the welcome first, then the rest in turn. */
export function splashMessageIndex(state: SplashState, messageCount: number): number {
  return messageCount > 0 ? state.shownCount % messageCount : 0;
}

/**
 * `count` different emojis from `pool` in random order (repeats only when the pool is smaller).
 * Empty strings and duplicates in the pool are ignored.
 */
export function pickSplashEmojis(pool: readonly string[], count = SPLASH_EMOJI_COUNT, random: () => number = Math.random): string[] {
  const unique = [...new Set(pool.filter((e) => e.trim() !== ''))];
  if (unique.length === 0) return [];
  for (let i = unique.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [unique[i], unique[j]] = [unique[j]!, unique[i]!];
  }
  return Array.from({ length: count }, (_, i) => unique[i % unique.length]!);
}
