import { CalendarDays, ChevronLeft, ChevronRight, Clock, Timer, Zap } from 'lucide-react';
import { useMemo } from 'react';
import { addDays, timeOf } from '../../domain/dates';
import { isDemoId } from '../../domain/demo';
import { findExercise, unknownExercise } from '../../domain/exercises';
import { sessionsOn, totalsOf } from '../../domain/sessions';
import type { AppData, Entry, ISODate, Session } from '../../domain/types';
import { texts } from '../../texts';
import { Button, IconButton } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { Section } from '../components/Section';
import { StatTiles } from '../components/StatTiles';
import { formatDateWithYear, formatDuration, formatRelativeDay, formatTotalTime } from '../format';

export interface TodayViewProps {
  data: AppData;
  date: ISODate;
  today: ISODate;
  onChangeDate: (date: ISODate) => void;
  onOpenEntry: (entry: Entry) => void;
  onStartSession: () => void;
}

export function TodayView({ data, date, today, onChangeDate, onOpenEntry, onStartSession }: TodayViewProps) {
  const sessions = useMemo(() => sessionsOn(data, date), [data, date]);
  const totals = useMemo(() => totalsOf(sessions), [sessions]);
  const isToday = date === today;

  return (
    <div className="view">
      <header className="view__header">
        <div className="view__heading">
          <span className="view__eyebrow">{formatDateWithYear(date)}</span>
          <h1 className={`view__title${isToday ? ' view__title--today' : ''}`}>{formatRelativeDay(date, today)}</h1>
        </div>
        <div className="daynav">
          <IconButton solid label={texts.today.previousDay} icon={<ChevronLeft size={22} />} onClick={() => onChangeDate(addDays(date, -1))} />
          {!isToday ? <IconButton solid label={texts.today.jumpToToday} icon={<CalendarDays size={20} />} onClick={() => onChangeDate(today)} /> : null}
          <IconButton
            solid
            label={texts.today.nextDay}
            icon={<ChevronRight size={22} />}
            onClick={() => onChangeDate(addDays(date, 1))}
            disabled={date >= today}
          />
        </div>
      </header>

      <StatTiles
        stats={[
          { label: texts.today.stats.reps, value: String(totals.reps), tone: 'accent' },
          { label: texts.today.stats.time, value: totals.seconds > 0 ? formatTotalTime(totals.seconds) : '–', tone: 'time' },
          { label: texts.today.stats.sessions, value: String(totals.sessions) },
        ]}
      />

      {isToday && !data.activeSession ? (
        <div className="start-session">
          <Button variant="primary" block icon={<Timer size={20} />} onClick={onStartSession}>
            {texts.timer.start}
          </Button>
          <p className="field__hint">{texts.timer.startHint}</p>
        </div>
      ) : null}

      {sessions.length === 0 ? (
        <EmptyState icon={<Zap size={26} />} title={texts.today.emptyTitle} text={isToday ? texts.today.emptyText : texts.today.emptyPast} />
      ) : (
        <Section title={texts.today.sessions} count={sessions.length}>
          <div className="list">
            {[...sessions].reverse().map((s) => (
              <SessionCard key={s.id} session={s} data={data} onOpenEntry={onOpenEntry} />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function SessionCard({ session, data, onOpenEntry }: { session: Session; data: AppData; onOpenEntry: (entry: Entry) => void }) {
  const totals = totalsOf([session]);
  return (
    <article className="session">
      <div className="session__head">
        <span className="session__time">
          <Clock size={18} aria-hidden="true" />
          {timeOf(session.startedAt)}
          {isDemoId(session.id) ? <span className="tag">{texts.settings.demo.tag}</span> : null}
          {data.activeSession?.id === session.id ? (
            <span className="tag tag--time">{texts.timer.runningTag}</span>
          ) : session.durationSeconds !== undefined ? (
            <span className="tag tag--time" title={texts.timer.timed}>
              <Timer size={12} aria-hidden="true" />
              {formatDuration(session.durationSeconds)}
            </span>
          ) : null}
        </span>
        <span className="session__summary">
          {totals.reps > 0 ? <span>{`${totals.reps} ${texts.common.reps}`}</span> : null}
          {totals.seconds > 0 ? <span>{formatDuration(totals.seconds)}</span> : null}
        </span>
      </div>
      {session.entries.map((e) => (
        <EntryRow key={e.id} entry={e} data={data} showTime={timeOf(e.at) !== timeOf(session.startedAt)} onOpen={() => onOpenEntry(e)} />
      ))}
    </article>
  );
}

export function EntryRow({ entry, data, showTime, onOpen }: { entry: Entry; data: AppData; showTime: boolean; onOpen: () => void }) {
  const exercise = findExercise(data, entry.exerciseId) ?? unknownExercise(entry.exerciseId);
  const isTime = entry.seconds !== undefined;
  return (
    <button type="button" className="entry" onClick={onOpen}>
      <span className="entry__emoji" aria-hidden="true">
        {exercise.emoji || '🏃'}
      </span>
      <span className="entry__body">
        <span className="entry__name">{exercise.name}</span>
        {showTime ? <span className="entry__meta">{timeOf(entry.at)}</span> : null}
      </span>
      <span className={`entry__amount${isTime ? ' entry__amount--time' : ''}`}>
        {isTime ? formatDuration(entry.seconds ?? 0) : entry.reps}
        {!isTime ? <small>{texts.common.reps}</small> : null}
      </span>
    </button>
  );
}
