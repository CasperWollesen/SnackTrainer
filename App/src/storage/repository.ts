import { validateAppData } from '../domain/backup';
import { emptyData, type AppData, type Exercise, type Settings } from '../domain/types';
import { loadRaw, removeRaw, requestPersistentStorage, saveRaw } from './storage';

const DATA_KEY = 'data';

type Listener = (data: AppData) => void;

/**
 * The single owner of the app's state. Holds the current AppData in memory,
 * persists every change to localStorage as one JSON blob and notifies subscribers.
 * Everything else reads through `get()`/`subscribe()` and writes through `update()`.
 */
class Repository {
  private data: AppData;
  private listeners = new Set<Listener>();
  private persistRequested = false;
  /** True when the last save failed (storage unavailable or full). */
  public lastSaveFailed = false;
  /** True when stored data existed but could not be read; it is left untouched until the next write. */
  public readonly loadedCorrupt: boolean;

  constructor() {
    const raw = loadRaw(DATA_KEY);
    let loaded: AppData | null = null;
    let corrupt = false;
    if (raw !== null) {
      try {
        loaded = migrate(JSON.parse(raw));
      } catch {
        loaded = null;
      }
      corrupt = loaded === null;
    }
    this.data = loaded ?? emptyData();
    this.loadedCorrupt = corrupt;
  }

  get(): AppData {
    return this.data;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Applies a pure transformation and persists the result. Returns the new data. */
  update(fn: (current: AppData) => AppData): AppData {
    const next = fn(this.data);
    if (next === this.data) return next;
    this.data = next;
    this.lastSaveFailed = !saveRaw(DATA_KEY, JSON.stringify(next));
    if (!this.persistRequested) {
      this.persistRequested = true;
      void requestPersistentStorage();
    }
    for (const l of this.listeners) l(next);
    return next;
  }

  replaceAll(data: AppData): AppData {
    return this.update(() => data);
  }

  clearAll(): AppData {
    removeRaw(DATA_KEY);
    return this.update(() => emptyData());
  }

  setSettings(patch: Partial<Settings>): AppData {
    return this.update((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
  }

  saveCustomExercise(exercise: Exercise): AppData {
    return this.update((d) => {
      const exists = d.customExercises.some((e) => e.id === exercise.id);
      const customExercises = exists
        ? d.customExercises.map((e) => (e.id === exercise.id ? exercise : e))
        : [...d.customExercises, exercise];
      return { ...d, customExercises };
    });
  }

  deleteCustomExercise(id: string): AppData {
    return this.update((d) => ({ ...d, customExercises: d.customExercises.filter((e) => e.id !== id) }));
  }
}

/**
 * Upgrades older stored shapes to the current one. Only version 1 exists today;
 * add a step here when DATA_VERSION changes (and keep validateAppData in sync).
 */
function migrate(raw: unknown): AppData | null {
  return validateAppData(raw);
}

export const repository = new Repository();
