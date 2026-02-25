import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  addTask,
  listTasks,
  getTask,
  getNextTask,
  updateTask,
  deleteTask,
  addSubTask,
  updateSubTask,
  deleteSubTask,
  listSubTasks,
} from '../src/tasks.js';

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'taskmaster-'));
  process.env['TASKMASTER_FILE'] = join(tempDir, 'tasks.json');
});

afterEach(() => {
  delete process.env['TASKMASTER_FILE'];
  rmSync(tempDir, { recursive: true, force: true });
});

// ── addTask ──────────────────────────────────────────────────────────────────

describe('addTask', () => {
  it('creates task with defaults: status=pending, priority=0, empty subtasks', () => {
    const result = addTask({ title: 'My task' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe('pending');
    expect(result.value.priority).toBe(0);
    expect(result.value.subtasks).toEqual([]);
    expect(result.value.title).toBe('My task');
    expect(result.value.id).toBeTruthy();
  });

  it('uses provided priority', () => {
    const result = addTask({ title: 'High priority', priority: 5 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.priority).toBe(5);
  });

  it('persists task to store', () => {
    addTask({ title: 'Persisted task' });
    const tasks = listTasks();
    expect(tasks).toHaveLength(1);
    expect(tasks[0]!.title).toBe('Persisted task');
  });
});

// ── listTasks ─────────────────────────────────────────────────────────────────

describe('listTasks', () => {
  beforeEach(() => {
    addTask({ title: 'Task A', priority: 1 });
    addTask({ title: 'Task B', priority: 2 });
    const r = addTask({ title: 'Task C', priority: 1 });
    if (r.ok) updateTask(r.value.id, { status: 'in_progress' });
  });

  it('returns all tasks', () => {
    const tasks = listTasks();
    expect(tasks).toHaveLength(3);
  });

  it('filters by status', () => {
    const tasks = listTasks({ status: 'in_progress' });
    expect(tasks).toHaveLength(1);
    expect(tasks[0]!.title).toBe('Task C');
  });

  it('filters by priority', () => {
    const tasks = listTasks({ priority: 1 });
    expect(tasks).toHaveLength(2);
    tasks.forEach((t) => expect(t.priority).toBe(1));
  });
});

// ── getTask ───────────────────────────────────────────────────────────────────

describe('getTask', () => {
  it('returns the task when found', () => {
    const added = addTask({ title: 'Find me' });
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    const result = getTask(added.value.id);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.title).toBe('Find me');
  });

  it('returns error when not found', () => {
    const result = getTask('nonexistent-id');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/not found/i);
  });
});

// ── getNextTask ───────────────────────────────────────────────────────────────

describe('getNextTask', () => {
  it('returns null when no tasks exist', () => {
    const result = getNextTask();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBeNull();
  });

  it('picks task with lowest priority', () => {
    addTask({ title: 'Low priority', priority: 5 });
    addTask({ title: 'High priority', priority: 1 });
    const result = getNextTask();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value?.title).toBe('High priority');
  });

  it('breaks ties by createdAt ascending', async () => {
    const r1 = addTask({ title: 'First', priority: 0 });
    // Small delay to ensure different createdAt
    await new Promise((r) => setTimeout(r, 5));
    addTask({ title: 'Second', priority: 0 });
    const result = getNextTask();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value?.title).toBe('First');
    expect(r1.ok && result.value?.id).toBe(r1.ok && (r1 as any).value.id);
  });

  it('skips non-pending tasks', () => {
    const r = addTask({ title: 'In progress', priority: 0 });
    if (r.ok) updateTask(r.value.id, { status: 'in_progress' });
    addTask({ title: 'Pending', priority: 1 });
    const result = getNextTask();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value?.title).toBe('Pending');
  });
});

// ── updateTask ────────────────────────────────────────────────────────────────

describe('updateTask', () => {
  it('updates provided fields', () => {
    const added = addTask({ title: 'Original' });
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    const result = updateTask(added.value.id, { title: 'Updated', status: 'in_progress' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.title).toBe('Updated');
    expect(result.value.status).toBe('in_progress');
  });

  it('partial update only changes provided fields', () => {
    const added = addTask({ title: 'Keep title', priority: 3 });
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    const result = updateTask(added.value.id, { status: 'completed' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.title).toBe('Keep title');
    expect(result.value.priority).toBe(3);
    expect(result.value.status).toBe('completed');
  });

  it('updates updatedAt', async () => {
    const added = addTask({ title: 'Time test' });
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    const originalUpdatedAt = added.value.updatedAt;
    await new Promise((r) => setTimeout(r, 5));
    const result = updateTask(added.value.id, { title: 'Changed' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.updatedAt).not.toBe(originalUpdatedAt);
  });

  it('returns error when task not found', () => {
    const result = updateTask('bad-id', { title: 'X' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/not found/i);
  });
});

// ── deleteTask ────────────────────────────────────────────────────────────────

describe('deleteTask', () => {
  it('removes the task', () => {
    const added = addTask({ title: 'Delete me' });
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    const result = deleteTask(added.value.id);
    expect(result.ok).toBe(true);
    expect(listTasks()).toHaveLength(0);
  });

  it('returns error when task not found', () => {
    const result = deleteTask('nonexistent');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/not found/i);
  });
});

// ── addSubTask ────────────────────────────────────────────────────────────────

describe('addSubTask', () => {
  it('adds subtask to task with default status=pending', () => {
    const task = addTask({ title: 'Parent' });
    expect(task.ok).toBe(true);
    if (!task.ok) return;
    const result = addSubTask(task.value.id, { agentType: 'planning' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe('pending');
    expect(result.value.agentType).toBe('planning');
    const fetched = getTask(task.value.id);
    expect(fetched.ok && fetched.value.subtasks).toHaveLength(1);
  });

  it('returns error when task not found', () => {
    const result = addSubTask('bad-id', { agentType: 'testing' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/not found/i);
  });
});

// ── updateSubTask ─────────────────────────────────────────────────────────────

describe('updateSubTask', () => {
  it('updates subtask fields', () => {
    const task = addTask({ title: 'Parent' });
    expect(task.ok).toBe(true);
    if (!task.ok) return;
    const sub = addSubTask(task.value.id, { agentType: 'implementation' });
    expect(sub.ok).toBe(true);
    if (!sub.ok) return;
    const result = updateSubTask(task.value.id, sub.value.id, { status: 'completed', notes: 'Done' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe('completed');
    expect(result.value.notes).toBe('Done');
  });

  it('returns error when task not found', () => {
    const result = updateSubTask('bad-task', 'bad-sub', { status: 'completed' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/task not found/i);
  });

  it('returns error when subtask not found', () => {
    const task = addTask({ title: 'Parent' });
    expect(task.ok).toBe(true);
    if (!task.ok) return;
    const result = updateSubTask(task.value.id, 'nonexistent-sub', { status: 'completed' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/subtask not found/i);
  });
});

// ── deleteSubTask ─────────────────────────────────────────────────────────────

describe('deleteSubTask', () => {
  it('removes subtask', () => {
    const task = addTask({ title: 'Parent' });
    expect(task.ok).toBe(true);
    if (!task.ok) return;
    const sub = addSubTask(task.value.id, { agentType: 'testing' });
    expect(sub.ok).toBe(true);
    if (!sub.ok) return;
    const result = deleteSubTask(task.value.id, sub.value.id);
    expect(result.ok).toBe(true);
    const fetched = getTask(task.value.id);
    expect(fetched.ok && fetched.value.subtasks).toHaveLength(0);
  });

  it('updates task.updatedAt when subtask deleted', async () => {
    const task = addTask({ title: 'Parent' });
    expect(task.ok).toBe(true);
    if (!task.ok) return;
    const before = task.value.updatedAt;
    const sub = addSubTask(task.value.id, { agentType: 'testing' });
    expect(sub.ok).toBe(true);
    if (!sub.ok) return;
    await new Promise((r) => setTimeout(r, 5));
    deleteSubTask(task.value.id, sub.value.id);
    const fetched = getTask(task.value.id);
    expect(fetched.ok).toBe(true);
    if (!fetched.ok) return;
    expect(fetched.value.updatedAt).not.toBe(before);
  });

  it('returns error when task not found', () => {
    const result = deleteSubTask('bad-task', 'bad-sub');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/task not found/i);
  });

  it('returns error when subtask not found', () => {
    const task = addTask({ title: 'Parent' });
    expect(task.ok).toBe(true);
    if (!task.ok) return;
    const result = deleteSubTask(task.value.id, 'bad-sub');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/subtask not found/i);
  });
});

// ── listSubTasks ──────────────────────────────────────────────────────────────

describe('listSubTasks', () => {
  beforeEach(() => {
    const t1 = addTask({ title: 'Task 1' });
    const t2 = addTask({ title: 'Task 2' });
    if (!t1.ok || !t2.ok) return;
    const s1 = addSubTask(t1.value.id, { agentType: 'planning' });
    const s2 = addSubTask(t1.value.id, { agentType: 'implementation' });
    addSubTask(t2.value.id, { agentType: 'planning' });
    if (s1.ok) updateSubTask(t1.value.id, s1.value.id, { status: 'completed' });
    // s2 stays pending
    void s2;
  });

  it('returns all subtasks with context', () => {
    const results = listSubTasks();
    expect(results).toHaveLength(3);
    results.forEach((r) => {
      expect(r.taskId).toBeTruthy();
      expect(r.taskTitle).toBeTruthy();
      expect(r.subtask).toBeTruthy();
    });
  });

  it('filters by agentType', () => {
    const results = listSubTasks({ agentType: 'planning' });
    expect(results).toHaveLength(2);
    results.forEach((r) => expect(r.subtask.agentType).toBe('planning'));
  });

  it('filters by status', () => {
    const results = listSubTasks({ status: 'completed' });
    expect(results).toHaveLength(1);
    expect(results[0]!.subtask.status).toBe('completed');
  });

  it('filters by both agentType and status', () => {
    const results = listSubTasks({ agentType: 'planning', status: 'completed' });
    expect(results).toHaveLength(1);
    expect(results[0]!.subtask.agentType).toBe('planning');
    expect(results[0]!.subtask.status).toBe('completed');
  });
});
