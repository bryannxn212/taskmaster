import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import app from '../src/server.js';
import { addTask, addSubTask } from '../src/tasks.js';

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'taskmaster-srv-'));
  process.env['TASKMASTER_FILE'] = join(tempDir, 'tasks.json');
});

afterEach(() => {
  delete process.env['TASKMASTER_FILE'];
  rmSync(tempDir, { recursive: true, force: true });
});

// ── GET /tasks ────────────────────────────────────────────────────────────────

describe('GET /tasks', () => {
  it('returns 200 with array', async () => {
    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('returns 200 filtered by status', async () => {
    addTask({ title: 'Pending task' });
    const added = addTask({ title: 'In progress task' });
    if (added.ok) {
      await request(app).patch(`/tasks/${added.value.id}`).send({ status: 'in_progress' });
    }
    const res = await request(app).get('/tasks?status=pending');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Pending task');
  });
});

// ── GET /tasks/next ───────────────────────────────────────────────────────────

describe('GET /tasks/next', () => {
  it('returns 200 with task when tasks exist', async () => {
    addTask({ title: 'Next task', priority: 0 });
    const res = await request(app).get('/tasks/next');
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Next task');
  });

  it('returns 200 with null when no tasks', async () => {
    const res = await request(app).get('/tasks/next');
    expect(res.status).toBe(200);
    expect(res.body).toBeNull();
  });
});

// ── GET /tasks/:id ────────────────────────────────────────────────────────────

describe('GET /tasks/:id', () => {
  it('returns 200 with task when found', async () => {
    const added = addTask({ title: 'Fetch me' });
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    const res = await request(app).get(`/tasks/${added.value.id}`);
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Fetch me');
  });

  it('returns 404 when not found', async () => {
    const res = await request(app).get('/tasks/nonexistent-id');
    expect(res.status).toBe(404);
  });
});

// ── POST /tasks ───────────────────────────────────────────────────────────────

describe('POST /tasks', () => {
  it('returns 201 with created task', async () => {
    const res = await request(app).post('/tasks').send({ title: 'New task', priority: 2 });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('New task');
    expect(res.body.priority).toBe(2);
    expect(res.body.id).toBeTruthy();
  });
});

// ── PATCH /tasks/:id ──────────────────────────────────────────────────────────

describe('PATCH /tasks/:id', () => {
  it('returns 200 with updated task', async () => {
    const added = addTask({ title: 'Original' });
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    const res = await request(app)
      .patch(`/tasks/${added.value.id}`)
      .send({ title: 'Updated', status: 'in_progress' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated');
    expect(res.body.status).toBe('in_progress');
  });

  it('returns 404 when not found', async () => {
    const res = await request(app).patch('/tasks/bad-id').send({ title: 'X' });
    expect(res.status).toBe(404);
  });
});

// ── DELETE /tasks/:id ─────────────────────────────────────────────────────────

describe('DELETE /tasks/:id', () => {
  it('returns 204 on success', async () => {
    const added = addTask({ title: 'Delete me' });
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    const res = await request(app).delete(`/tasks/${added.value.id}`);
    expect(res.status).toBe(204);
  });

  it('returns 404 when not found', async () => {
    const res = await request(app).delete('/tasks/bad-id');
    expect(res.status).toBe(404);
  });
});

// ── POST /tasks/:id/subtasks ──────────────────────────────────────────────────

describe('POST /tasks/:id/subtasks', () => {
  it('returns 201 with created subtask', async () => {
    const task = addTask({ title: 'Parent' });
    expect(task.ok).toBe(true);
    if (!task.ok) return;
    const res = await request(app)
      .post(`/tasks/${task.value.id}/subtasks`)
      .send({ agentType: 'planning' });
    expect(res.status).toBe(201);
    expect(res.body.agentType).toBe('planning');
    expect(res.body.status).toBe('pending');
  });

  it('returns 404 when task not found', async () => {
    const res = await request(app)
      .post('/tasks/bad-id/subtasks')
      .send({ agentType: 'testing' });
    expect(res.status).toBe(404);
  });
});

// ── PATCH /tasks/:id/subtasks/:sid ────────────────────────────────────────────

describe('PATCH /tasks/:id/subtasks/:sid', () => {
  it('returns 200 with updated subtask', async () => {
    const task = addTask({ title: 'Parent' });
    expect(task.ok).toBe(true);
    if (!task.ok) return;
    const sub = addSubTask(task.value.id, { agentType: 'implementation' });
    expect(sub.ok).toBe(true);
    if (!sub.ok) return;
    const res = await request(app)
      .patch(`/tasks/${task.value.id}/subtasks/${sub.value.id}`)
      .send({ status: 'completed' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('completed');
  });

  it('returns 404 when subtask not found', async () => {
    const task = addTask({ title: 'Parent' });
    expect(task.ok).toBe(true);
    if (!task.ok) return;
    const res = await request(app)
      .patch(`/tasks/${task.value.id}/subtasks/nonexistent`)
      .send({ status: 'completed' });
    expect(res.status).toBe(404);
  });
});

// ── DELETE /tasks/:id/subtasks/:sid ───────────────────────────────────────────

describe('DELETE /tasks/:id/subtasks/:sid', () => {
  it('returns 204 on success', async () => {
    const task = addTask({ title: 'Parent' });
    expect(task.ok).toBe(true);
    if (!task.ok) return;
    const sub = addSubTask(task.value.id, { agentType: 'documentation' });
    expect(sub.ok).toBe(true);
    if (!sub.ok) return;
    const res = await request(app).delete(`/tasks/${task.value.id}/subtasks/${sub.value.id}`);
    expect(res.status).toBe(204);
  });

  it('returns 404 when not found', async () => {
    const task = addTask({ title: 'Parent' });
    expect(task.ok).toBe(true);
    if (!task.ok) return;
    const res = await request(app).delete(`/tasks/${task.value.id}/subtasks/bad-sub`);
    expect(res.status).toBe(404);
  });
});

// ── GET /subtasks ─────────────────────────────────────────────────────────────

describe('GET /subtasks', () => {
  beforeEach(() => {
    const t1 = addTask({ title: 'Task 1' });
    const t2 = addTask({ title: 'Task 2' });
    if (!t1.ok || !t2.ok) return;
    addSubTask(t1.value.id, { agentType: 'planning' });
    addSubTask(t1.value.id, { agentType: 'implementation' });
    addSubTask(t2.value.id, { agentType: 'planning' });
  });

  it('returns 200 with all subtasks', async () => {
    const res = await request(app).get('/subtasks');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
  });

  it('returns 200 filtered by agentType', async () => {
    const res = await request(app).get('/subtasks?agentType=planning');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    res.body.forEach((item: any) => expect(item.subtask.agentType).toBe('planning'));
  });
});
