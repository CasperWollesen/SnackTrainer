import { describe, expect, it } from 'vitest';
import {
  initialSplashState,
  parseSplashState,
  pickSplashEmojis,
  recordSplashShown,
  shouldShowSplash,
  splashMessageIndex,
  SPLASH_FIRST_LAUNCHES,
  type SplashState,
} from './splash';

describe('splash', () => {
  it('shows on the first launches, also several times on the same day', () => {
    let s = initialSplashState();
    for (let i = 0; i < SPLASH_FIRST_LAUNCHES; i++) {
      expect(shouldShowSplash(s, '2026-09-24')).toBe(true);
      s = recordSplashShown(s, '2026-09-24');
    }
    expect(s.shownCount).toBe(SPLASH_FIRST_LAUNCHES);
    expect(shouldShowSplash(s, '2026-09-24')).toBe(false);
  });

  it('then shows once per day', () => {
    let s: SplashState = { shownCount: SPLASH_FIRST_LAUNCHES, lastShownDate: '2026-09-24' };
    expect(shouldShowSplash(s, '2026-09-25')).toBe(true);
    s = recordSplashShown(s, '2026-09-25');
    expect(shouldShowSplash(s, '2026-09-25')).toBe(false);
  });

  it('starts with the first message and moves on each showing', () => {
    expect(splashMessageIndex(initialSplashState(), 8)).toBe(0);
    expect(splashMessageIndex({ shownCount: 3, lastShownDate: null }, 8)).toBe(3);
    expect(splashMessageIndex({ shownCount: 9, lastShownDate: null }, 8)).toBe(1);
    expect(splashMessageIndex({ shownCount: 9, lastShownDate: null }, 0)).toBe(0);
  });

  it('parses stored state defensively', () => {
    expect(parseSplashState(null)).toEqual(initialSplashState());
    expect(parseSplashState({ shownCount: -1, lastShownDate: 'yesterday' })).toEqual(initialSplashState());
    expect(parseSplashState({ shownCount: 7, lastShownDate: '2026-09-24' })).toEqual({ shownCount: 7, lastShownDate: '2026-09-24' });
  });

  it('picks distinct emojis and repeats only when the pool is too small', () => {
    const picked = pickSplashEmojis(['a', 'b', 'c', 'd', 'e', 'f', 'a', ''], 5, () => 0.5);
    expect(picked).toHaveLength(5);
    expect(new Set(picked).size).toBe(5);
    expect(picked.every((e) => 'abcdef'.includes(e))).toBe(true);
    expect(pickSplashEmojis(['x', 'y'], 5)).toHaveLength(5);
    expect(pickSplashEmojis([], 5)).toEqual([]);
  });
});
