import { Zap } from 'lucide-react';
import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { SPLASH_EMOJI_COUNT, SPLASH_EMOJI_MS } from '../../domain/splash';
import { texts } from '../../texts';
import type { SplashShowing } from '../hooks/useSplash';

export interface SplashScreenProps {
  splash: SplashShowing | null;
  onClose: () => void;
}

const FALLBACK_EMOJI = '💪';

/**
 * Full-screen intro: an exercise emoji that changes every second, one message and a Skip button
 * that fills up until the splash closes by itself. Built on <dialog> like Sheet, so Escape works
 * and the app behind it is inert.
 */
export function SplashScreen({ splash, onClose }: SplashScreenProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const open = splash !== null;
  const titleId = useId();

  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="splash"
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      {splash ? <SplashContent key={splash.key} splash={splash} titleId={titleId} onClose={onClose} /> : null}
    </dialog>
  );
}

function SplashContent({ splash, titleId, onClose }: { splash: SplashShowing; titleId: string; onClose: () => void }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setStep((s) => s + 1), SPLASH_EMOJI_MS);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (step >= SPLASH_EMOJI_COUNT) onClose();
  }, [step, onClose]);

  const emoji = splash.emojis[Math.min(step, splash.emojis.length - 1)] ?? FALLBACK_EMOJI;
  const message = texts.splash.messages[splash.messageIndex] ?? texts.splash.messages[0];
  const duration = { '--splash-duration': `${SPLASH_EMOJI_COUNT * SPLASH_EMOJI_MS}ms` } as CSSProperties;

  return (
    <div className="splash__panel">
      <p className="splash__brand">
        <span className="splash__logo" aria-hidden="true">
          <Zap size={18} strokeWidth={2.5} />
        </span>
        {texts.app.name}
      </p>

      <div className="splash__stage">
        <span key={step} className="splash__emoji" aria-hidden="true">
          {emoji}
        </span>
        <h2 className="splash__title" id={titleId}>
          {message.title}
        </h2>
        <p className="splash__body">{message.body}</p>
      </div>

      <button type="button" className="splash__skip" onClick={onClose} autoFocus>
        <span className="splash__skip-fill" style={duration} aria-hidden="true" />
        <span className="splash__skip-label">{texts.splash.skip}</span>
      </button>
    </div>
  );
}
