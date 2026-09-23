import { RefreshCw } from 'lucide-react';
import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { texts } from '../../texts';
import { Button } from './Button';

const CHECK_INTERVAL_MS = 60 * 60 * 1000;

/**
 * "New version ready" banner. The new service worker only takes over when the
 * user presses the button, so a reload never interrupts a form.
 */
export function UpdateBanner({ suppressed }: { suppressed: boolean }) {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      const check = () => {
        if (document.visibilityState === 'visible') void registration.update();
      };
      setInterval(check, CHECK_INTERVAL_MS);
      document.addEventListener('visibilitychange', check);
    },
  });

  useEffect(() => {
    if (needRefresh) document.title = `${texts.app.name} · ${texts.update.ready}`;
    else document.title = texts.app.name;
  }, [needRefresh]);

  if (!needRefresh || suppressed) return null;

  return (
    <div className="banner banner--accent update-banner" role="status">
      <RefreshCw size={20} className="banner__icon" aria-hidden="true" />
      <span className="banner__text">
        <strong>{texts.update.ready}</strong>
      </span>
      <span className="banner__actions">
        <Button variant="ghost" size="sm" onClick={() => setNeedRefresh(false)}>
          {texts.update.later}
        </Button>
        <Button variant="primary" size="sm" onClick={() => void updateServiceWorker(true)}>
          {texts.update.reload}
        </Button>
      </span>
    </div>
  );
}
