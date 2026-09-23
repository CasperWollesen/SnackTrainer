import { Plus, Square, Timer } from 'lucide-react';
import { elapsedSeconds, idleDeadline } from '../../domain/timer';
import { totalsOf } from '../../domain/sessions';
import type { AppData } from '../../domain/types';
import { texts } from '../../texts';
import { formatDuration } from '../format';
import { Button } from './Button';

export interface ActiveSessionBarProps {
  data: AppData;
  nowMs: number;
  onLog: () => void;
  onStop: () => void;
  onKeepGoing: () => void;
}

/** Shown on every tab while a snack session timer runs: elapsed time, what was logged, Log and Stop. */
export function ActiveSessionBar({ data, nowMs, onLog, onStop, onKeepGoing }: ActiveSessionBarProps) {
  const active = data.activeSession;
  if (!active) return null;
  const session = data.sessions.find((s) => s.id === active.id);
  const totals = session ? totalsOf([session]) : null;
  const timeout = data.settings.sessionTimeoutMinutes;
  const leftMs = idleDeadline(active, timeout) - nowMs;
  const warning = leftMs <= 60_000;

  const summary = totals
    ? [texts.timer.entries(totals.entries), totals.reps > 0 ? `${totals.reps} ${texts.common.reps}` : '', totals.seconds > 0 ? formatDuration(totals.seconds) : '']
        .filter(Boolean)
        .join(' · ')
    : texts.timer.nothingYet;

  return (
    <section className={`timerbar${warning ? ' timerbar--warning' : ''}`} aria-label={texts.timer.running}>
      <div className="timerbar__main">
        <Timer size={22} className="timerbar__icon" aria-hidden="true" />
        <div className="timerbar__text">
          <span className="timerbar__label">{texts.timer.running}</span>
          <span className="timerbar__clock" role="timer">
            {formatDuration(elapsedSeconds(active, nowMs))}
          </span>
          <span className="timerbar__meta">{summary}</span>
        </div>
        <div className="timerbar__actions">
          <Button variant="primary" size="sm" icon={<Plus size={16} />} onClick={onLog}>
            {texts.timer.log}
          </Button>
          <Button size="sm" icon={<Square size={14} />} onClick={onStop}>
            {texts.timer.stop}
          </Button>
        </div>
      </div>
      {warning ? (
        <div className="timerbar__warning" role="status">
          <span>{texts.timer.stoppingIn(formatDuration(Math.max(0, Math.ceil(leftMs / 1000))))}</span>
          <Button size="sm" variant="ghost" onClick={onKeepGoing}>
            {texts.timer.keepGoing}
          </Button>
        </div>
      ) : (
        <p className="timerbar__hint">{texts.timer.autoStopHint(timeout)}</p>
      )}
    </section>
  );
}
