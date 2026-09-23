// Thin, defensive wrapper around localStorage (PowerOn pattern).
// Every call is wrapped in try/catch so the app keeps working when storage is
// unavailable (private mode, quota exceeded, blocked site data).
// Keys are prefixed because localStorage is shared with the owner's other
// GitHub Pages projects on the same origin.

const PREFIX = 'snacktrainer.';

export function loadRaw(key: string): string | null {
  try {
    return localStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

export function saveRaw(key: string, value: string): boolean {
  try {
    localStorage.setItem(PREFIX + key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeRaw(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // ignore
  }
}

/** Ask the browser not to evict our data under storage pressure. Best effort. */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) return await navigator.storage.persist();
  } catch {
    // ignore
  }
  return false;
}

export async function isStoragePersisted(): Promise<boolean | null> {
  try {
    if (navigator.storage?.persisted) return await navigator.storage.persisted();
  } catch {
    // ignore
  }
  return null;
}
