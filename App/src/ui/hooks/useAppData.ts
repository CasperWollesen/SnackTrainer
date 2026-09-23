import { useSyncExternalStore } from 'react';
import type { AppData } from '../../domain/types';
import { repository } from '../../storage/repository';

/** The current AppData, re-rendering whenever the repository changes. */
export function useAppData(): AppData {
  return useSyncExternalStore(
    (listener) => repository.subscribe(listener),
    () => repository.get(),
  );
}
