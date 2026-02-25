import { readFileSync, writeFileSync } from 'fs';
import type { TaskStore, Result } from './types.js';

function getStorePath(): string {
  return process.env['TASKMASTER_FILE'] ?? 'tasks.json';
}

export function readStore(): TaskStore {
  const path = getStorePath();
  try {
    const raw = readFileSync(path, 'utf-8');
    return JSON.parse(raw) as TaskStore;
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'code' in err && (err as NodeJS.ErrnoException).code === 'ENOENT') {
      return { tasks: [] };
    }
    throw err;
  }
}

export function writeStore(store: TaskStore): void {
  writeFileSync(getStorePath(), JSON.stringify(store, null, 2), 'utf-8');
}

export function withStore<T>(fn: (store: TaskStore) => Result<T>): Result<T> {
  const store = readStore();
  const result = fn(store);
  if (result.ok) {
    writeStore(store);
  }
  return result;
}
