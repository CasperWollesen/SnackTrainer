import { Pause, Play, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { texts } from '../../texts';
import { formatDuration } from '../format';
import { Button } from './Button';

export interface StopwatchProps {
  /** Whole seconds. */
  value: number;
  onChange: (seconds: number) => void;
}

/**
 * Stopwatch plus manual mm:ss entry. The elapsed time is derived from
 * timestamps (not tick counting), so it stays correct when the phone
 * throttles timers in the background.
 */
export function Stopwatch({ value, onChange }: StopwatchProps) {
  const [running, setRunning] = useState(false);
  // Wall-clock instant the current run started, and seconds accumulated before it.
  const startedAt = useRef<number | null>(null);
  const base = useRef(value);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      if (startedAt.current === null) return;
      onChangeRef.current(base.current + Math.floor((Date.now() - startedAt.current) / 1000));
    };
    const timer = setInterval(tick, 250);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [running]);

  const start = () => {
    base.current = value;
    startedAt.current = Date.now();
    setRunning(true);
  };
  const pause = () => {
    if (startedAt.current !== null) {
      onChange(base.current + Math.floor((Date.now() - startedAt.current) / 1000));
    }
    startedAt.current = null;
    setRunning(false);
  };
  const reset = () => {
    startedAt.current = null;
    base.current = 0;
    setRunning(false);
    onChange(0);
  };

  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  const setManual = (m: number, s: number) => {
    if (running) pause();
    const total = Math.max(0, Math.round(m) * 60 + Math.max(0, Math.min(59, Math.round(s))));
    base.current = total;
    onChange(total);
  };

  return (
    <div className="stopwatch" role="group" aria-label={texts.log.stopwatch}>
      <div className={`stopwatch__display${running ? ' stopwatch__display--running' : ''}`} aria-live="off">
        {/* Only the dot pulses: animating the changing digits themselves made mobile browsers
            show the first frame ("0:00") ghosting behind them. */}
        <span className="stopwatch__dot" aria-hidden="true" />
        <span>{formatDuration(value)}</span>
      </div>
      <div className="stopwatch__controls">
        {running ? (
          <Button variant="primary" size="lg" icon={<Pause size={22} />} onClick={pause}>
            {texts.log.pause}
          </Button>
        ) : (
          <Button variant="primary" size="lg" icon={<Play size={22} />} onClick={start}>
            {value > 0 ? texts.log.resume : texts.log.start}
          </Button>
        )}
        <Button size="lg" icon={<RotateCcw size={20} />} onClick={reset} disabled={value === 0 && !running}>
          {texts.log.reset}
        </Button>
      </div>
      <div className="field" style={{ width: '100%' }}>
        <span className="field__label">{texts.log.manualTime}</span>
        <div className="stopwatch__manual">
          <input
            className="input"
            type="number"
            inputMode="numeric"
            min={0}
            aria-label={texts.log.minutes}
            value={minutes === 0 ? '' : String(minutes)}
            placeholder={`0 ${texts.log.minutes}`}
            onChange={(e) => setManual(Number(e.target.value || 0), seconds)}
            onFocus={(e) => e.target.select()}
          />
          <input
            className="input"
            type="number"
            inputMode="numeric"
            min={0}
            max={59}
            aria-label={texts.log.seconds}
            value={seconds === 0 ? '' : String(seconds)}
            placeholder={`0 ${texts.log.seconds}`}
            onChange={(e) => setManual(minutes, Number(e.target.value || 0))}
            onFocus={(e) => e.target.select()}
          />
        </div>
      </div>
    </div>
  );
}
