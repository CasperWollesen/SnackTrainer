import { useEffect, useState } from 'react';

export type WakeLockStatus = 'off' | 'on' | 'unsupported' | 'unavailable';

/**
 * Keeps the screen on while `active` (Screen Wake Lock API, same pattern as CW.ShowerTimer).
 * The browser drops the lock when the page is hidden, so it is requested again when the app
 * becomes visible. Purely local; unsupported browsers just report it.
 */
export function useWakeLock(active: boolean): WakeLockStatus {
  const [status, setStatus] = useState<WakeLockStatus>('off');

  useEffect(() => {
    if (!active) {
      setStatus('off');
      return;
    }
    let disposed = false;
    let requesting = false;
    let lock: WakeLockSentinel | null = null;

    const request = async () => {
      if (document.visibilityState !== 'visible' || disposed || lock || requesting) return;
      if (!('wakeLock' in navigator)) {
        setStatus('unsupported');
        return;
      }
      requesting = true;
      try {
        const acquired = await navigator.wakeLock.request('screen');
        if (disposed) {
          await acquired.release();
          return;
        }
        lock = acquired;
        setStatus('on');
        acquired.addEventListener('release', () => {
          lock = null;
          if (!disposed) setStatus('off');
        });
      } catch {
        if (!disposed) setStatus('unavailable');
      } finally {
        requesting = false;
      }
    };

    void request();
    document.addEventListener('visibilitychange', request);
    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', request);
      void lock?.release();
    };
  }, [active]);

  return status;
}
