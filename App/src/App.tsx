import { Smartphone, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { findEntry } from './domain/sessions';
import { isBuiltIn } from './domain/exercises';
import type { Entry, Exercise, ISODate } from './domain/types';
import { repository } from './storage/repository';
import { texts } from './texts';
import { Button, IconButton } from './ui/components/Button';
import { Nav, type Tab } from './ui/components/Nav';
import { Toast } from './ui/components/Toast';
import { UpdateBanner } from './ui/components/UpdateBanner';
import { useAppData } from './ui/hooks/useAppData';
import { useClock } from './ui/hooks/useClock';
import { useInstallPrompt } from './ui/hooks/useInstallPrompt';
import { ToastProvider, useToast } from './ui/hooks/useToast';
import { useActions } from './ui/useActions';
import { EntrySheet } from './ui/views/EntrySheet';
import { ExerciseEditor } from './ui/views/ExerciseEditor';
import { ExercisesView } from './ui/views/ExercisesView';
import { HistoryView } from './ui/views/HistoryView';
import { LogSheet } from './ui/views/LogSheet';
import { SettingsSheet } from './ui/views/SettingsSheet';
import { TodayView } from './ui/views/TodayView';

type Overlay =
  | { kind: 'none' }
  | { kind: 'log'; exercise: Exercise | null }
  | { kind: 'entry'; entryId: string }
  | { kind: 'exercise'; exercise: Exercise | null }
  | { kind: 'settings' };

export function App() {
  return (
    <ToastProvider>
      <Shell />
      <Toast />
    </ToastProvider>
  );
}

function Shell() {
  const data = useAppData();
  const { today, nowTime } = useClock();
  const actions = useActions();
  const install = useInstallPrompt();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('today');
  const [date, setDate] = useState<ISODate>(today);
  const [overlay, setOverlay] = useState<Overlay>({ kind: 'none' });

  // Warn once when stored data could not be read.
  useEffect(() => {
    if (repository.loadedCorrupt) toast.show({ message: texts.toast.corruptData, variant: 'error', duration: 12_000 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When the app is left open past midnight while showing "today", follow the date.
  const [lastToday, setLastToday] = useState(today);
  if (lastToday !== today) {
    setLastToday(today);
    if (date === lastToday) setDate(today);
  }

  const closeOverlay = useCallback(() => setOverlay({ kind: 'none' }), []);
  const openEntry = data.sessions.length > 0 && overlay.kind === 'entry' ? (findEntry(data, overlay.entryId)?.entry ?? null) : null;

  const hasAnyData = data.sessions.length > 0;
  const showInstallHint = !install.isStandalone && !data.settings.installHintDismissed && hasAnyData && (install.canPrompt || install.platform === 'ios');

  const openLog = (exercise: Exercise | null = null) => setOverlay({ kind: 'log', exercise });
  const openDay = (d: ISODate) => {
    setDate(d);
    setTab('today');
  };

  const pickFromExercises = (exercise: Exercise) => {
    // Custom exercises open the editor on long tap in a later version; for now tapping logs.
    setDate(today);
    openLog(exercise);
  };

  return (
    <div className="app">
      <Nav active={tab} onChange={setTab} onLog={() => openLog(null)} onSettings={() => setOverlay({ kind: 'settings' })} />

      <main className="app__main">
        <UpdateBanner suppressed={overlay.kind !== 'none'} />
        {showInstallHint ? (
          <div className="banner" style={{ marginBottom: 'var(--space-4)' }}>
            <Smartphone size={20} className="banner__icon" aria-hidden="true" />
            <span className="banner__text">
              <strong>{texts.settings.install.title}</strong>
              {texts.settings.install.description}
            </span>
            <span className="banner__actions">
              <Button size="sm" onClick={() => setOverlay({ kind: 'settings' })}>
                {texts.settings.install.button}
              </Button>
              <IconButton label={texts.common.close} icon={<X size={18} />} onClick={() => repository.setSettings({ installHintDismissed: true })} />
            </span>
          </div>
        ) : null}

        {tab === 'today' ? (
          <TodayView
            data={data}
            date={date}
            today={today}
            onChangeDate={setDate}
            onLog={() => openLog(null)}
            onOpenEntry={(entry: Entry) => setOverlay({ kind: 'entry', entryId: entry.id })}
          />
        ) : tab === 'history' ? (
          <HistoryView data={data} today={today} onOpenDay={openDay} />
        ) : (
          <ExercisesView data={data} today={today} onPick={pickFromExercises} onAddCustom={() => setOverlay({ kind: 'exercise', exercise: null })} />
        )}

        {tab === 'exercises' && data.customExercises.length > 0 ? (
          <section className="section" style={{ marginTop: 'var(--space-6)' }}>
            <div className="section__header">
              <h3 className="section__title">{texts.exercises.custom}</h3>
            </div>
            <div className="chips">
              {data.customExercises.map((e) => (
                <button key={e.id} type="button" className="chip" onClick={() => setOverlay({ kind: 'exercise', exercise: e })}>
                  <span aria-hidden="true">{e.emoji || '🏃'}</span>
                  {e.name} · {texts.common.edit}
                </button>
              ))}
            </div>
          </section>
        ) : null}
      </main>

      <LogSheet
        open={overlay.kind === 'log'}
        data={data}
        date={date}
        today={today}
        nowTime={nowTime}
        initialExercise={overlay.kind === 'log' ? overlay.exercise : null}
        onClose={closeOverlay}
        onSave={(input) => {
          actions.log(input);
          if (tab !== 'today') setTab('today');
        }}
      />

      <EntrySheet entry={openEntry} data={data} onClose={closeOverlay} onSave={actions.edit} onDelete={actions.remove} />

      <ExerciseEditor
        open={overlay.kind === 'exercise'}
        exercise={overlay.kind === 'exercise' && overlay.exercise && !isBuiltIn(overlay.exercise.id) ? overlay.exercise : null}
        onClose={closeOverlay}
        onSave={actions.saveExercise}
        onDelete={actions.deleteExercise}
      />

      <SettingsSheet open={overlay.kind === 'settings'} data={data} onClose={closeOverlay} install={install} />
    </div>
  );
}
