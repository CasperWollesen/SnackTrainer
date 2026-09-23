/** Local calendar date, "YYYY-MM-DD". Never UTC. */
export type ISODate = string;

/** Local wall-clock time, "HH:MM", 24-hour. */
export type TimeString = string;

/** Local date and time, "YYYY-MM-DDTHH:MM". Sorts lexicographically. */
export type LocalDateTime = string;

export type ExerciseMode = 'reps' | 'time';

export interface Exercise {
  /** Slug for built-ins ("push-up"); "custom-<random>" for user-created exercises. */
  id: string;
  name: string;
  emoji: string;
  category: string;
  /** Default logging mode. Any exercise can still be logged in the other mode. */
  mode: ExerciseMode;
  /** The movement lifts the user's own body (informational, from MuscleUp). */
  bodyweight: boolean;
}

export interface Entry {
  id: string;
  exerciseId: string;
  at: LocalDateTime;
  /** Present when logged in reps mode. */
  reps?: number;
  /** Present when logged in time mode. */
  seconds?: number;
}

export interface Session {
  id: string;
  date: ISODate;
  startedAt: LocalDateTime;
  /** Sorted by `at`. Never empty in stored data. */
  entries: Entry[];
}

export interface Settings {
  /** Minutes since the previous entry within which a new entry joins the same session. */
  sessionGapMinutes: number;
  installHintDismissed: boolean;
  /** Exercise ids left out of the pickers (built-in or custom). Their entries still count everywhere. */
  hiddenExerciseIds: string[];
}

/** 2: settings.hiddenExerciseIds added (v1 data is upgraded by `upgradeAppData`). */
export const DATA_VERSION = 2;

export interface AppData {
  version: typeof DATA_VERSION;
  /** Sorted by startedAt ascending. */
  sessions: Session[];
  customExercises: Exercise[];
  settings: Settings;
}

export const DEFAULT_SETTINGS: Settings = {
  sessionGapMinutes: 20,
  installHintDismissed: false,
  hiddenExerciseIds: [],
};

export function emptyData(): AppData {
  return {
    version: DATA_VERSION,
    sessions: [],
    customExercises: [],
    settings: { ...DEFAULT_SETTINGS, hiddenExerciseIds: [] },
  };
}
