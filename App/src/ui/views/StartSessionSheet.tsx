import { Hourglass, Timer } from 'lucide-react';
import type { AppData } from '../../domain/types';
import { repository } from '../../storage/repository';
import { texts } from '../../texts';
import { Button } from '../components/Button';
import { Stepper } from '../components/FormFields';
import { Sheet } from '../components/Sheet';

export interface StartSessionSheetProps {
  open: boolean;
  data: AppData;
  onClose: () => void;
  /** Starts counting up (null) or a count-down of that many minutes. */
  onStart: (countdownMinutes: number | null) => void;
}

/** "Start snack session": pick Count up or a Count-down (with its length). The last mode used is highlighted. */
export function StartSessionSheet({ open, data, onClose, onStart }: StartSessionSheetProps) {
  const { timerMode, countdownMinutes, sessionTimeoutMinutes } = data.settings;
  return (
    <Sheet open={open} onClose={onClose} title={texts.timer.startTitle}>
      <div className="list">
        <section className="start-option">
          <div className="start-option__head">
            <Timer size={22} className="start-option__icon start-option__icon--up" aria-hidden="true" />
            <div>
              <h3 className="start-option__title">{texts.timer.modeUp}</h3>
              <p className="settings-group__text">{texts.timer.upText(sessionTimeoutMinutes)}</p>
            </div>
          </div>
          <Button variant={timerMode === 'up' ? 'primary' : 'secondary'} block icon={<Timer size={18} />} onClick={() => onStart(null)}>
            {texts.timer.startUp}
          </Button>
        </section>

        <section className="start-option">
          <div className="start-option__head">
            <Hourglass size={22} className="start-option__icon" aria-hidden="true" />
            <div>
              <h3 className="start-option__title">{texts.timer.modeDown}</h3>
              <p className="settings-group__text">{texts.timer.downText}</p>
            </div>
          </div>
          <Stepper
            label={texts.timer.minutesLabel}
            value={countdownMinutes}
            min={1}
            max={60}
            format={(v) => `${v} ${texts.common.minutes}`}
            onChange={(v) => repository.setSettings({ countdownMinutes: v })}
          />
          <Button
            variant={timerMode === 'down' ? 'primary' : 'secondary'}
            block
            icon={<Hourglass size={18} />}
            onClick={() => onStart(countdownMinutes)}
          >
            {texts.timer.startCountdown(countdownMinutes)}
          </Button>
        </section>
      </div>
    </Sheet>
  );
}
