import { Hourglass, Plus, Square, Timer, Trash2 } from 'lucide-react';
import { toTimeString } from '../../domain/dates';
import { countdownEndMs, elapsedSeconds, idleDeadline, remainingSeconds } from '../../domain/timer';
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
  /** Throws the session away (with Undo). */
  onDiscard: () => void;
  onKeepGoing: () => void;
  /** The screen is kept on (wake lock held). */
  screenOn?: boolean;
}

/**
 * Shown on every tab while a snack session timer runs: elapsed time (or the time left of a
 * count-down, with a progress bar), what was logged, Log, Stop and Discard.
 */
export function ActiveSessionBar({ data, nowMs, onLog, onStop, onDiscard, onKeepGoing, screenOn = false }: ActiveSessionBarProps) {
  const active = data.activeSession;
  if (!active) return null;
  const session = data.sessions.find((s) => s.id === active.id);
  const totals = session ? totalsOf([session]) : null;
  const timeout = data.settings.sessionTimeoutMinutes;
  const endMs = countdownEndMs(active);
  const countdown = endMs !== null;
  const remaining = remainingSeconds(active, nowMs);
  const leftMs = idleDeadline(active, timeout) - nowMs;
  const warning = countdown ? remaining <= 10 : leftMs <= 60_000;
  const Icon = countdown ? Hourglass : Timer;
  const label = countdown ? texts.timer.countdown : texts.timer.running;

  const summary = totals
    ? [texts.timer.entries(totals.entries), totals.reps > 0 ? `${totals.reps} ${texts.common.reps}` : '', totals.seconds > 0 ? formatDuration(totals.seconds) : '']
        .filter(Boolean)
        .join(' · ')
    : texts.timer.nothingYet;

  return (
    <section className={`timerbar${warning ? ' timerbar--warning' : ''}`} aria-label={label}>
      <div className="timerbar__main">
        <Icon size={22} className="timerbar__icon" aria-hidden="true" />
        <div className="timerbar__text">
          <span className="timerbar__label">{label}</span>
          <span className="timerbar__clock" role="timer">
            {formatDuration(countdown ? remaining : elapsedSeconds(active, nowMs))}
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
      {countdown ? (
        <div className="timerbar__progress" aria-hidden="true">
          <span style={{ width: `${Math.min(100, (elapsedSeconds(active, nowMs) / (active.countdownSeconds ?? 1)) * 100)}%` }} />
        </div>
      ) : null}
      <div className="timerbar__foot">
        {!countdown && warning ? (
          <div className="timerbar__warning" role="status">
            <span>{texts.timer.stoppingIn(formatDuration(Math.max(0, Math.ceil(leftMs / 1000))))}</span>
            <Button size="sm" variant="ghost" onClick={onKeepGoing}>
              {texts.timer.keepGoing}
            </Button>
          </div>
        ) : (
          <p className="timerbar__hint">
            {countdown ? texts.timer.endsAt(toTimeString(new Date(endMs))) : texts.timer.autoStopHint(timeout)}
            {screenOn ? ` ${texts.timer.screenOn}` : ''}
          </p>
        )}
        <Button size="sm" variant="ghost" icon={<Trash2 size={14} />} onClick={onDiscard}>
          {texts.timer.discard}
        </Button>
      </div>
    </section>
  );
}
