import { useCallback, useEffect, useRef, useState } from 'react';
import { visibleExercises } from '../../domain/exercises';
import { pickSplashEmojis, recordSplashShown, shouldShowSplash, splashMessageIndex } from '../../domain/splash';
import type { ISODate } from '../../domain/types';
import { repository } from '../../storage/repository';
import { texts } from '../../texts';

export interface SplashShowing {
  /** Index into texts.splash.messages. */
  messageIndex: number;
  emojis: string[];
  /** Changes per showing so the screen restarts its timer. */
  key: number;
}

function showing(messageIndex: number): SplashShowing {
  const pool = visibleExercises(repository.get()).map((e) => e.emoji);
  return { messageIndex, emojis: pickSplashEmojis(pool), key: Date.now() };
}

/**
 * Decides whether the intro splash shows: on the first launches and then on the first launch of
 * each day (also when an app left open comes back on a new day). `replay` shows it on demand.
 */
export function useSplash(today: ISODate) {
  const [current, setCurrent] = useState<SplashShowing | null>(null);
  // Guards against StrictMode's double effect run counting one launch twice.
  const checkedFor = useRef<ISODate | null>(null);

  useEffect(() => {
    if (checkedFor.current === today) return;
    checkedFor.current = today;
    const state = repository.getSplashState();
    if (!shouldShowSplash(state, today)) return;
    repository.setSplashState(recordSplashShown(state, today));
    setCurrent(showing(splashMessageIndex(state, texts.splash.messages.length)));
  }, [today]);

  const replay = useCallback(() => setCurrent(showing(Math.floor(Math.random() * texts.splash.messages.length))), []);
  const close = useCallback(() => setCurrent(null), []);

  return { current, replay, close };
}
