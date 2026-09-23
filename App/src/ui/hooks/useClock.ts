import { useEffect, useState } from 'react';
import { msUntilNextMidnight, toISODate, toTimeString } from '../../domain/dates';
import type { ISODate, TimeString } from '../../domain/types';

export interface Clock {
  today: ISODate;
  nowTime: TimeString;
}

function readClock(): Clock {
  const now = new Date();
  return { today: toISODate(now), nowTime: toTimeString(now) };
}

/**
 * The current local date and time (minute resolution). Re-evaluated when the
 * app becomes visible or focused, once a minute while open, and at the next
 * local midnight.
 */
export function useClock(): Clock {
  const [clock, setClock] = useState<Clock>(readClock);

  useEffect(() => {
    const refresh = () => {
      const next = readClock();
      setClock((prev) => (prev.today === next.today && prev.nowTime === next.nowTime ? prev : next));
    };

    let midnightTimer: ReturnType<typeof setTimeout> | undefined;
    const armMidnight = () => {
      if (midnightTimer) clearTimeout(midnightTimer);
      midnightTimer = setTimeout(() => {
        refresh();
        armMidnight();
      }, msUntilNextMidnight(new Date()) + 500);
    };
    armMidnight();

    const minuteTimer = setInterval(refresh, 60_000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', refresh);
    window.addEventListener('pageshow', refresh);

    return () => {
      if (midnightTimer) clearTimeout(midnightTimer);
      clearInterval(minuteTimer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('pageshow', refresh);
    };
  }, []);

  return clock;
}
