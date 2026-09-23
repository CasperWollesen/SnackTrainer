import { useEffect, useState } from 'react';

/**
 * Epoch milliseconds, refreshed every second while `active` (and when the app becomes
 * visible again). Used for the session timer; idle otherwise so nothing ticks needlessly.
 */
export function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const tick = () => setNow(Date.now());
    tick();
    const timer = setInterval(tick, 1000);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('focus', tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('focus', tick);
    };
  }, [active]);
  return now;
}
