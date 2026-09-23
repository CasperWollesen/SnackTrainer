import type { AppData, Exercise, ExerciseMode } from './types';

export const CUSTOM_CATEGORY = 'Custom';

/** Category order for grouped lists. Custom categories sort after these, alphabetically. */
export const CATEGORY_ORDER = ['Legs', 'Glutes', 'Back', 'Chest', 'Shoulders', 'Arms', 'Core', 'Full Body', CUSTOM_CATEGORY];

type Row = [id: string, name: string, emoji: string, category: string, bodyweight: boolean, mode?: ExerciseMode];

/**
 * The exercises SnackTrainer ships with. Copied from MuscleUp's ExerciseCatalog.cs
 * (name, emoji, category, MovesBodyweight) without the webcam rep-counting config.
 * "Any Exercise (Auto)" is left out: it only made sense for the Rep Cam.
 */
const ROWS: Row[] = [
  // Legs
  ['squat', 'Squat', '🏋️', 'Legs', true],
  ['goblet-squat', 'Goblet Squat', '🍷', 'Legs', true],
  ['front-squat', 'Front Squat', '🤲', 'Legs', true],
  ['bulgarian-split-squat', 'Bulgarian Split Squat', '🦩', 'Legs', true],
  ['lunge', 'Lunge', '🦵', 'Legs', true],
  ['step-up', 'Step-Up', '📶', 'Legs', true],
  ['leg-press', 'Leg Press', '🦿', 'Legs', false],
  ['leg-extension', 'Leg Extension', '📐', 'Legs', false],
  ['leg-curl', 'Leg Curl', '🌙', 'Legs', false],
  ['calf-raise', 'Calf Raise', '🦶', 'Legs', true],
  ['romanian-deadlift', 'Romanian Deadlift', '🦴', 'Legs', false],
  // Glutes
  ['hip-thrust', 'Hip Thrust', '🍑', 'Glutes', false],
  ['glute-bridge', 'Glute Bridge', '🌉', 'Glutes', true],
  // Back
  ['deadlift', 'Deadlift', '🪨', 'Back', false],
  ['bent-over-row', 'Bent-Over Row', '🚣', 'Back', false],
  ['single-arm-dumbbell-row', 'Single-Arm Dumbbell Row', '🏹', 'Back', false],
  ['seated-cable-row', 'Seated Cable Row', '🛶', 'Back', false],
  ['lat-pulldown', 'Lat Pulldown', '⬇️', 'Back', false],
  ['pull-up', 'Pull-Up', '🧗', 'Back', true],
  ['chin-up', 'Chin-Up', '🐒', 'Back', true],
  ['face-pull', 'Face Pull', '🎭', 'Back', false],
  ['shrug', 'Shrug', '🤷', 'Back', false],
  ['back-extension', 'Back Extension', '🌅', 'Back', true],
  // Chest
  ['push-up', 'Push-Up', '🧎', 'Chest', true],
  ['bench-press', 'Bench Press', '🛏️', 'Chest', false],
  ['incline-bench-press', 'Incline Bench Press', '⛰️', 'Chest', false],
  ['dumbbell-bench-press', 'Dumbbell Bench Press', '🔔', 'Chest', false],
  ['chest-fly', 'Chest Fly', '🦋', 'Chest', false],
  ['dips', 'Dips', '🪂', 'Chest', true],
  // Shoulders
  ['shoulder-press', 'Shoulder Press', '🙆', 'Shoulders', false],
  ['arnold-press', 'Arnold Press', '🌀', 'Shoulders', false],
  ['lateral-raise', 'Lateral Raise', '🦅', 'Shoulders', false],
  ['front-raise', 'Front Raise', '⬆️', 'Shoulders', false],
  ['rear-delt-fly', 'Rear Delt Fly', '🦇', 'Shoulders', false],
  ['upright-row', 'Upright Row', '⛓️', 'Shoulders', false],
  // Arms
  ['bicep-curl', 'Bicep Curl', '💪', 'Arms', false],
  ['hammer-curl', 'Hammer Curl', '🔨', 'Arms', false],
  ['concentration-curl', 'Concentration Curl', '🎯', 'Arms', false],
  ['overhead-tricep-extension', 'Overhead Tricep Extension', '🙌', 'Arms', false],
  ['tricep-pushdown', 'Tricep Pushdown', '🔻', 'Arms', false],
  ['skull-crusher', 'Skull Crusher', '💀', 'Arms', false],
  ['tricep-kickback', 'Tricep Kickback', '🦘', 'Arms', false],
  // Core
  ['sit-up', 'Sit-Up', '⤴️', 'Core', true],
  ['crunch', 'Crunch', '🍫', 'Core', true],
  ['leg-raise', 'Leg Raise', '🔺', 'Core', true],
  ['russian-twist', 'Russian Twist', '🌪️', 'Core', true],
  ['bicycle-crunch', 'Bicycle Crunch', '🚴', 'Core', true],
  ['mountain-climber', 'Mountain Climber', '🏔️', 'Core', true],
  ['dead-bug', 'Dead Bug', '🐞', 'Core', true],
  ['plank', 'Plank (hold)', '🧱', 'Core', true, 'time'],
  // Full Body
  ['burpee', 'Burpee', '💥', 'Full Body', true],
  ['kettlebell-swing', 'Kettlebell Swing', '🏺', 'Full Body', false],
  ['clean-and-press', 'Clean and Press', '🧼', 'Full Body', false],
  ['thruster', 'Thruster', '🚀', 'Full Body', false],
  ['snatch', 'Snatch', '⚡', 'Full Body', false],
  ['box-jump', 'Box Jump', '📦', 'Full Body', true],
  ['jumping-jack', 'Jumping Jack', '⭐', 'Full Body', true],
];

export const BUILT_IN_EXERCISES: readonly Exercise[] = ROWS.map(([id, name, emoji, category, bodyweight, mode]) => ({
  id,
  name,
  emoji,
  category,
  mode: mode ?? 'reps',
  bodyweight,
}));

/** Built-ins followed by the user's custom exercises. */
export function allExercises(data: Pick<AppData, 'customExercises'>): Exercise[] {
  return [...BUILT_IN_EXERCISES, ...data.customExercises];
}

export function findExercise(data: Pick<AppData, 'customExercises'>, id: string): Exercise | undefined {
  return allExercises(data).find((e) => e.id === id);
}

/** Placeholder for entries whose exercise was deleted (custom exercise removed). */
export function unknownExercise(id: string): Exercise {
  return { id, name: 'Unknown exercise', emoji: '❔', category: CUSTOM_CATEGORY, mode: 'reps', bodyweight: false };
}

export function isHidden(data: Pick<AppData, 'settings'>, id: string): boolean {
  return data.settings.hiddenExerciseIds.includes(id);
}

/** Built-ins and custom exercises minus the hidden ones: what the pickers list. */
export function visibleExercises(data: Pick<AppData, 'customExercises' | 'settings'>): Exercise[] {
  const hidden = new Set(data.settings.hiddenExerciseIds);
  return allExercises(data).filter((e) => !hidden.has(e.id));
}

/** Hidden exercises that still exist, in catalogue order. */
export function hiddenExercises(data: Pick<AppData, 'customExercises' | 'settings'>): Exercise[] {
  const hidden = new Set(data.settings.hiddenExerciseIds);
  return allExercises(data).filter((e) => hidden.has(e.id));
}

/** Returns the hidden-id list with `ids` hidden (`hide`) or shown again. Order is kept, no duplicates. */
export function withHidden(hiddenIds: readonly string[], ids: readonly string[], hide: boolean): string[] {
  if (!hide) {
    const show = new Set(ids);
    return hiddenIds.filter((id) => !show.has(id));
  }
  return [...new Set([...hiddenIds, ...ids])];
}

/** Built-in exercises that are visible and have never been logged: candidates for "Hide unused". */
export function unusedBuiltInIds(data: Pick<AppData, 'sessions' | 'settings'>): string[] {
  const used = new Set(data.sessions.flatMap((s) => s.entries.map((e) => e.exerciseId)));
  const hidden = new Set(data.settings.hiddenExerciseIds);
  return BUILT_IN_EXERCISES.filter((e) => !used.has(e.id) && !hidden.has(e.id)).map((e) => e.id);
}

export function isBuiltIn(id: string): boolean {
  return BUILT_IN_EXERCISES.some((e) => e.id === id);
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Case- and punctuation-insensitive search over name and category.
 * "pushup" matches "Push-Up"; every query word must match somewhere.
 */
export function searchExercises(exercises: readonly Exercise[], query: string): Exercise[] {
  const q = normalize(query);
  if (!q) return [...exercises];
  const words = q.split(' ');
  return exercises.filter((e) => {
    const hay = `${normalize(e.name)} ${normalize(e.name).replace(/ /g, '')} ${normalize(e.category)}`;
    return words.every((w) => hay.includes(w));
  });
}

/** Exercise ids ordered by most recent use, most recent first, no duplicates. */
export function recentExerciseIds(data: Pick<AppData, 'sessions'>, limit = 6): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const entries = data.sessions.flatMap((s) => s.entries).sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  for (const entry of entries) {
    if (seen.has(entry.exerciseId)) continue;
    seen.add(entry.exerciseId);
    out.push(entry.exerciseId);
    if (out.length >= limit) break;
  }
  return out;
}

export function categoryRank(category: string): number {
  const i = CATEGORY_ORDER.indexOf(category);
  return i === -1 ? CATEGORY_ORDER.length : i;
}

/** Groups exercises by category in catalogue order; categories keep their internal order. */
export function groupByCategory(exercises: readonly Exercise[]): { category: string; exercises: Exercise[] }[] {
  const map = new Map<string, Exercise[]>();
  for (const e of exercises) {
    const list = map.get(e.category);
    if (list) list.push(e);
    else map.set(e.category, [e]);
  }
  return [...map.entries()]
    .sort(([a], [b]) => categoryRank(a) - categoryRank(b) || a.localeCompare(b))
    .map(([category, list]) => ({ category, exercises: list }));
}
