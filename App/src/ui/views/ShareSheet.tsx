import { Check, Copy, Share2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { APP_NAME, SHARE_URL, texts } from '../../texts';
import { Button } from '../components/Button';
import { QrCode } from '../components/QrCode';
import { Sheet } from '../components/Sheet';

export interface ShareSheetProps {
  open: boolean;
  onClose: () => void;
}

type CopyState = 'idle' | 'copied' | 'failed';

/** QR code and link for the deployed app. Uses the system share sheet where there is one. */
export function ShareSheet({ open, onClose }: ShareSheetProps) {
  const [copy, setCopy] = useState<CopyState>('idle');
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  useEffect(() => {
    if (copy === 'idle') return;
    const id = window.setTimeout(() => setCopy('idle'), 2500);
    return () => window.clearTimeout(id);
  }, [copy]);

  const share = async () => {
    if (canShare) {
      try {
        await navigator.share({ title: APP_NAME, text: texts.app.tagline, url: SHARE_URL });
      } catch {
        // Cancelled by the user, or refused: nothing to report.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(SHARE_URL);
      setCopy('copied');
    } catch {
      setCopy('failed');
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={texts.share.title}>
      <section className="settings-group">
        <p className="settings-group__text">{texts.share.description}</p>
        <div className="share">
          <QrCode text={SHARE_URL} label={texts.share.qrLabel(SHARE_URL)} />
          <a className="share__url" href={SHARE_URL} target="_blank" rel="noreferrer">
            {SHARE_URL.replace(/^https:\/\//, '').replace(/\/$/, '')}
          </a>
        </div>
        <div className="settings-group__actions share__actions">
          <Button
            icon={canShare ? <Share2 size={18} /> : copy === 'copied' ? <Check size={18} /> : <Copy size={18} />}
            onClick={() => void share()}
          >
            {canShare ? texts.share.button : copy === 'copied' ? texts.share.copied : texts.share.copy}
          </Button>
        </div>
        {copy === 'failed' ? <p className="field__hint">{texts.share.copyFailed}</p> : null}
      </section>
    </Sheet>
  );
}
