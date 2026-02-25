import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, existsSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { readStore, writeStore, withStore } from '../src/store.js';

let tempFile: string;

beforeEach(() => {
  const dir = mkdtempSync(join(tmpdir(), 'taskmaster-'));
  tempFile = join(dir, 'tasks.json');
  process.env['TASKMASTER_FILE'] = tempFile;
});

afterEach(() => {
  delete process.env['TASKMASTER_FILE'];
  try {
    rmSync(tempFile, { force: true });
    rmSync(tempFile.replace(/\/tasks\.json$/, ''), { recursive: true, force: true });
  } catch {
    // ignore
  }
});

describe('readStore', () => {
  it('returns { tasks: [] } when file does not exist', () => {
    const store = readStore();
    expect(store).toEqual({ tasks: [] });
  });

  it('returns parsed data when file exists', () => {
    const data = { tasks: [{ id: '1', title: 'Test task' }] };
    writeFileSync(tempFile, JSON.stringify(data), 'utf-8');
    const store = readStore();
    expect(store).toEqual(data);
  });

  it('throws on malformed JSON', () => {
    writeFileSync(tempFile, 'not valid json', 'utf-8');
    expect(() => readStore()).toThrow();
  });
});

describe('writeStore', () => {
  it('writes JSON with 2-space indent', () => {
    const store = { tasks: [] };
    writeStore(store);
    const raw = readFileSync(tempFile, 'utf-8');
    expect(raw).toBe(JSON.stringify(store, null, 2));
  });
});

describe('withStore', () => {
  it('writes store when fn returns ok: true', () => {
    const result = withStore((store) => {
      store.tasks.push({ id: 'abc' } as any);
      return { ok: true, value: 'done' };
    });
    expect(result).toEqual({ ok: true, value: 'done' });
    expect(existsSync(tempFile)).toBe(true);
    const saved = JSON.parse(readFileSync(tempFile, 'utf-8'));
    expect(saved.tasks).toHaveLength(1);
    expect(saved.tasks[0].id).toBe('abc');
  });

  it('does NOT write store when fn returns ok: false', () => {
    withStore((_store) => {
      return { ok: false, error: 'something went wrong' };
    });
    expect(existsSync(tempFile)).toBe(false);
  });
});
