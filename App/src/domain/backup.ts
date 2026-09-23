import { compareISO, isISODate, isLocalDateTime } from './dates';
import { DATA_VERSION, DEFAULT_SETTINGS, type AppData, type Entry, type Exercise, type Session, type Settings } from './types';

export const BACKUP_APP_ID = 'snacktrainer';
export const BACKUP_FORMAT_VERSION = 1;

export interface BackupFile {
  app: typeof BACKUP_APP_ID;
  formatVersion: number;
  exportedAt: string;
  data: AppData;
}

export interface BackupSummary {
  sessions: number;
  entries: number;
  customExercises: number;
  firstDate: string | null;
  lastDate: string | null;
  exportedAt: string | null;
}

export type BackupError = 'not-json' | 'not-backup' | 'unsupported-version' | 'invalid-data';

export type ParseResult = { ok: true; data: AppData; summary: BackupSummary } | { ok: false; error: BackupError };

export function createBackup(data: AppData, now: Date): BackupFile {
  return { app: BACKUP_APP_ID, formatVersion: BACKUP_FORMAT_VERSION, exportedAt: now.toISOString(), data };
}

export function serializeBackup(backup: BackupFile): string {
  return JSON.stringify(backup, null, 2);
}

export function summarize(data: AppData, exportedAt: string | null): BackupSummary {
  const dates = data.sessions.map((s) => s.date).sort(compareISO);
  return {
    sessions: data.sessions.length,
    entries: data.sessions.reduce((n, s) => n + s.entries.length, 0),
    customExercises: data.customExercises.length,
    firstDate: dates[0] ?? null,
    lastDate: dates[dates.length - 1] ?? null,
    exportedAt,
  };
}

/** Parses and validates backup JSON. Never throws. */
export function parseBackup(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'not-json' };
  }
  if (!isRecord(raw) || raw.app !== BACKUP_APP_ID || !isRecord(raw.data)) {
    return { ok: false, error: 'not-backup' };
  }
  if (raw.formatVersion !== BACKUP_FORMAT_VERSION) {
    return { ok: false, error: 'unsupported-version' };
  }
  const data = validateAppData(upgradeAppData(raw.data));
  if (!data) return { ok: false, error: 'invalid-data' };
  const exportedAt = typeof raw.exportedAt === 'string' ? raw.exportedAt : null;
  return { ok: true, data, summary: summarize(data, exportedAt) };
}

// ---------------------------------------------------------------------------
// Validation. Also used by the repository when reading localStorage, so a corrupt
// blob is rejected instead of crashing the app.

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonNegativeInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateEntry(raw: unknown): Entry | null {
  if (!isRecord(raw)) return null;
  if (!isNonEmptyString(raw.id) || !isNonEmptyString(raw.exerciseId) || !isLocalDateTime(raw.at)) return null;
  const hasReps = raw.reps !== undefined;
  const hasSeconds = raw.seconds !== undefined;
  if (hasReps === hasSeconds) return null; // exactly one
  if (hasReps && !isNonNegativeInt(raw.reps)) return null;
  if (hasSeconds && !isNonNegativeInt(raw.seconds)) return null;
  const entry: Entry = { id: raw.id, exerciseId: raw.exerciseId, at: raw.at };
  if (hasReps) entry.reps = raw.reps as number;
  else entry.seconds = raw.seconds as number;
  return entry;
}

function validateSession(raw: unknown): Session | null {
  if (!isRecord(raw)) return null;
  if (!isNonEmptyString(raw.id) || !isISODate(raw.date) || !isLocalDateTime(raw.startedAt)) return null;
  if (!Array.isArray(raw.entries) || raw.entries.length === 0) return null;
  const entries: Entry[] = [];
  for (const e of raw.entries) {
    const entry = validateEntry(e);
    if (!entry) return null;
    entries.push(entry);
  }
  entries.sort((a, b) => compareISO(a.at, b.at));
  return { id: raw.id, date: raw.date, startedAt: raw.startedAt, entries };
}

function validateExercise(raw: unknown): Exercise | null {
  if (!isRecord(raw)) return null;
  if (!isNonEmptyString(raw.id) || !isNonEmptyString(raw.name) || !isNonEmptyString(raw.category)) return null;
  if (raw.mode !== 'reps' && raw.mode !== 'time') return null;
  return {
    id: raw.id,
    name: raw.name,
    emoji: typeof raw.emoji === 'string' ? raw.emoji : '',
    category: raw.category,
    mode: raw.mode,
    bodyweight: raw.bodyweight === true,
  };
}

function validateSettings(raw: unknown): Settings {
  const s: Settings = { ...DEFAULT_SETTINGS, hiddenExerciseIds: [] };
  if (!isRecord(raw)) return s;
  if (typeof raw.sessionGapMinutes === 'number' && raw.sessionGapMinutes >= 0 && raw.sessionGapMinutes <= 24 * 60) {
    s.sessionGapMinutes = Math.round(raw.sessionGapMinutes);
  }
  if (typeof raw.installHintDismissed === 'boolean') s.installHintDismissed = raw.installHintDismissed;
  if (Array.isArray(raw.hiddenExerciseIds)) {
    s.hiddenExerciseIds = [...new Set(raw.hiddenExerciseIds.filter(isNonEmptyString))];
  }
  return s;
}

/**
 * Brings an older stored/backed-up AppData shape up to DATA_VERSION, one step at a time.
 * Returns the input unchanged when it is not a known older version; validateAppData
 * then accepts or rejects it. Used by the repository (localStorage) and by backup import.
 */
export function upgradeAppData(raw: unknown): unknown {
  if (!isRecord(raw)) return raw;
  let data: Record<string, unknown> = raw;
  if (data.version === 1) {
    // 1 -> 2: settings.hiddenExerciseIds (nothing hidden).
    const settings = isRecord(data.settings) ? data.settings : {};
    data = { ...data, version: 2, settings: { ...settings, hiddenExerciseIds: [] } };
  }
  return data;
}

/** Returns a clean AppData or null when the structure is unusable. */
export function validateAppData(raw: unknown): AppData | null {
  if (!isRecord(raw)) return null;
  if (raw.version !== DATA_VERSION) return null;
  if (!Array.isArray(raw.sessions)) return null;
  const sessions: Session[] = [];
  const ids = new Set<string>();
  for (const s of raw.sessions) {
    const session = validateSession(s);
    if (!session || ids.has(session.id)) return null;
    ids.add(session.id);
    sessions.push(session);
  }
  sessions.sort((a, b) => compareISO(a.startedAt, b.startedAt));
  const customExercises: Exercise[] = [];
  if (raw.customExercises !== undefined) {
    if (!Array.isArray(raw.customExercises)) return null;
    for (const e of raw.customExercises) {
      const ex = validateExercise(e);
      if (!ex) return null;
      customExercises.push(ex);
    }
  }
  return { version: DATA_VERSION, sessions, customExercises, settings: validateSettings(raw.settings) };
}
