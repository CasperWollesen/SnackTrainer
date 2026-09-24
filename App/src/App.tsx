import { Dumbbell, FlaskConical, QrCode, Settings, Smartphone, Sparkles, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { hasDemoData } from './domain/demo';
import { findEntry } from './domain/sessions';
import { findExercise, isBuiltIn, unknownExercise } from './domain/exercises';
import type { Entry, Exercise, ISODate } from './domain/types';
import { repository } from './storage/repository';
import { texts } from './texts';
import { Button, IconButton } from './ui/components/Button';
import { Nav, type Tab } from './ui/components/Nav';
import { Toast } from './ui/components/Toast';
import { ActiveSessionBar } from './ui/components/ActiveSessionBar';
import { UpdateBanner } from './ui/components/UpdateBanner';
import { useAppData } from './ui/hooks/useAppData';
import { useClock } from './ui/hooks/useClock';
import { useInstallPrompt } from './ui/hooks/useInstallPrompt';
import { useNow } from './ui/hooks/useNow';
import { useSplash } from './ui/hooks/useSplash';
import { ToastProvider, useToast } from './ui/hooks/useToast';
import { useActions } from './ui/useActions';
import { EntrySheet } from './ui/views/EntrySheet';
import { ExerciseEditor } from './ui/views/ExerciseEditor';
import { ExerciseSheet } from './ui/views/ExerciseSheet';
import { ExercisesView } from './ui/views/ExercisesView';
import { HistoryView, initialHistoryState, type HistoryState } from './ui/views/HistoryView';
import { LogSheet } from './ui/views/LogSheet';
import { MenuSheet, type MenuItem } from './ui/views/MenuSheet';
import { SettingsSheet } from './ui/views/SettingsSheet';
import { ShareSheet } from './ui/views/ShareSheet';
import { SplashScreen } from './ui/views/SplashScreen';
import { TodayView } from './ui/views/TodayView';

type Overlay =
  | { kind: 'none' }
  | { kind: 'log'; exercise: Exercise | null }
  | { kind: 'entry'; entryId: string }
  | { kind: 'exercise'; exercise: Exercise | null }
  | { kind: 'exerciseInfo'; exerciseId: string }
  | { kind: 'settings' }
  | { kind: 'share' }
  | { kind: 'menu' };

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
  const splash = useSplash(today);
  const [tab, setTab] = useState<Tab>('today');
  const [date, setDate] = useState<ISODate>(today);
  const [overlay, setOverlay] = useState<Overlay>({ kind: 'none' });
  const [history, setHistory] = useState<HistoryState>(() => initialHistoryState(today));
  const changeHistory = useCallback((patch: Partial<HistoryState>) => setHistory((h) => ({ ...h, ...patch })), []);

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
    if (history.anchor === lastToday) setHistory((h) => ({ ...h, anchor: today }));
  }

  const closeOverlay = useCallback(() => setOverlay({ kind: 'none' }), []);

  // Session timer: tick every second while it runs and stop it once it has been idle too long
  // (also right after opening the app, when it may have been closed for a while).
  const timerRunning = data.activeSession !== null;
  const nowMs = useNow(timerRunning);
  useEffect(() => {
    if (timerRunning) actions.autoStopTimer();
  }, [timerRunning, nowMs, actions]);
  const openEntry = data.sessions.length > 0 && overlay.kind === 'entry' ? (findEntry(data, overlay.entryId)?.entry ?? null) : null;

  const hasAnyData = data.sessions.length > 0;
  const showInstallHint = !install.isStandalone && !data.settings.installHintDismissed && hasAnyData && (install.canPrompt || install.platform === 'ios');

  const openLog = (exercise: Exercise | null = null) => setOverlay({ kind: 'log', exercise });
  const openDay = (d: ISODate) => {
    setDate(d);
    setTab('today');
  };

  const openExercise = (exerciseId: string) => setOverlay({ kind: 'exerciseInfo', exerciseId });
  // Looked up on every render so the page follows edits; a deleted custom exercise shows as unknown.
  const infoExercise =
    overlay.kind === 'exerciseInfo' ? (findExercise(data, overlay.exerciseId) ?? unknownExercise(overlay.exerciseId)) : null;

  // The phone menu. Add a destination here; the tab bar stays Today · History · Menu.
  const menuItems: MenuItem[] = [
    {
      id: 'exercises',
      label: texts.tabs.exercises,
      hint: texts.nav.exercisesHint,
      icon: Dumbbell,
      current: tab === 'exercises',
      isTab: true,
      onSelect: () => {
        setTab('exercises');
        closeOverlay();
      },
    },
    { id: 'settings', label: texts.settings.title, hint: texts.nav.settingsHint, icon: Settings, onSelect: () => setOverlay({ kind: 'settings' }) },
    { id: 'share', label: texts.share.title, hint: texts.nav.shareHint, icon: QrCode, onSelect: () => setOverlay({ kind: 'share' }) },
    {
      id: 'splash',
      label: texts.splash.title,
      hint: texts.nav.splashHint,
      icon: Sparkles,
      onSelect: () => {
        closeOverlay();
        splash.replay();
      },
    },
  ];

  return (
    <div className="app">
      <Nav
        active={tab}
        onChange={setTab}
        onLog={() => openLog(null)}
        links={menuItems.filter((item) => !item.isTab)}
        onMenu={() => setOverlay({ kind: 'menu' })}
      />

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

        {hasDemoData(data) ? (
          <div className="banner banner--demo" style={{ marginBottom: 'var(--space-4)' }}>
            <FlaskConical size={20} className="banner__icon" aria-hidden="true" />
            <span className="banner__text">
              <strong>{texts.settings.demo.banner}</strong>
              {texts.settings.demo.bannerHint}
            </span>
            <span className="banner__actions">
              <Button size="sm" onClick={() => actions.setDemo(false)}>
                {texts.settings.demo.bannerRemove}
              </Button>
            </span>
          </div>
        ) : null}

        <ActiveSessionBar
          data={data}
          nowMs={nowMs}
          onLog={() => {
            setDate(today);
            openLog(null);
          }}
          onStop={actions.stopTimer}
          onKeepGoing={() => actions.touchTimer(true)}
        />

        {tab === 'today' ? (
          <TodayView
            data={data}
            date={date}
            today={today}
            onChangeDate={setDate}
            onOpenEntry={(entry: Entry) => setOverlay({ kind: 'entry', entryId: entry.id })}
            onStartSession={actions.startTimer}
          />
        ) : tab === 'history' ? (
          <HistoryView data={data} today={today} state={history} onChange={changeHistory} onOpenDay={openDay} onOpenExercise={openExercise} />
        ) : (
          <ExercisesView
            data={data}
            today={today}
            onOpen={(e) => openExercise(e.id)}
            onAddCustom={() => setOverlay({ kind: 'exercise', exercise: null })}
            onSetHidden={actions.setHidden}
          />
        )}
      </main>

      <LogSheet
        open={overlay.kind === 'log'}
        data={data}
        date={date}
        today={today}
        nowTime={nowTime}
        initialExercise={overlay.kind === 'log' ? overlay.exercise : null}
        onClose={closeOverlay}
        onActivity={() => actions.touchTimer()}
        onSave={(input) => {
          actions.log(input);
          if (tab !== 'today') setTab('today');
        }}
      />

      <ExerciseSheet
        exercise={infoExercise}
        data={data}
        today={today}
        onClose={closeOverlay}
        onLog={(e) => {
          setDate(today);
          openLog(e);
        }}
        onEdit={(e) => setOverlay({ kind: 'exercise', exercise: e })}
        onSetHidden={(e, hide) => {
          // Close first: the modal sheet makes the toast (and its Undo) unreachable.
          closeOverlay();
          actions.setHidden([e.id], hide);
        }}
        onOpenDay={(d) => {
          closeOverlay();
          openDay(d);
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

      <MenuSheet open={overlay.kind === 'menu'} items={menuItems} onClose={closeOverlay} />

      <SettingsSheet open={overlay.kind === 'settings'} data={data} onClose={closeOverlay} install={install} onDemo={actions.setDemo} />

      <ShareSheet open={overlay.kind === 'share'} onClose={closeOverlay} />

      <SplashScreen splash={splash.current} onClose={splash.close} />
    </div>
  );
}
