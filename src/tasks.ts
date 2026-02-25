import { v4 as uuidv4 } from 'uuid';
import { readStore, withStore } from './store.js';
import type {
  Task,
  SubTask,
  TaskStatus,
  Result,
  CreateTaskInput,
  UpdateTaskInput,
  CreateSubTaskInput,
  UpdateSubTaskInput,
  TaskFilter,
  SubTaskFilter,
  SubTaskWithContext,
} from './types.js';

function now(): string {
  return new Date().toISOString();
}

export function addTask(input: CreateTaskInput): Result<Task> {
  return withStore((store) => {
    const task: Task = {
      id: uuidv4(),
      title: input.title,
      description: input.description,
      status: 'pending',
      priority: input.priority ?? 0,
      subtasks: [],
      createdAt: now(),
      updatedAt: now(),
    };
    store.tasks.push(task);
    return { ok: true, value: task };
  });
}

export function listTasks(filter?: TaskFilter): Task[] {
  const store = readStore();
  let tasks = store.tasks;
  if (filter?.status !== undefined) {
    tasks = tasks.filter((t) => t.status === filter.status);
  }
  if (filter?.priority !== undefined) {
    tasks = tasks.filter((t) => t.priority === filter.priority);
  }
  return tasks;
}

export function getTask(id: string): Result<Task> {
  const store = readStore();
  const task = store.tasks.find((t) => t.id === id);
  if (!task) {
    return { ok: false, error: `Task not found: ${id}` };
  }
  return { ok: true, value: task };
}

export function getNextTask(): Result<Task | null> {
  const store = readStore();
  const pending = store.tasks.filter((t) => t.status === 'pending');
  if (pending.length === 0) {
    return { ok: true, value: null };
  }
  pending.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.createdAt.localeCompare(b.createdAt);
  });
  return { ok: true, value: pending[0]! };
}

export function updateTask(id: string, input: UpdateTaskInput): Result<Task> {
  return withStore((store) => {
    const task = store.tasks.find((t) => t.id === id);
    if (!task) {
      return { ok: false, error: `Task not found: ${id}` };
    }
    if (input.title !== undefined) task.title = input.title;
    if (input.description !== undefined) task.description = input.description;
    if (input.status !== undefined) task.status = input.status;
    if (input.priority !== undefined) task.priority = input.priority;
    task.updatedAt = now();
    return { ok: true, value: task };
  });
}

export function deleteTask(id: string): Result<void> {
  return withStore((store) => {
    const idx = store.tasks.findIndex((t) => t.id === id);
    if (idx === -1) {
      return { ok: false, error: `Task not found: ${id}` };
    }
    store.tasks.splice(idx, 1);
    return { ok: true, value: undefined };
  });
}

export function addSubTask(taskId: string, input: CreateSubTaskInput): Result<SubTask> {
  return withStore((store) => {
    const task = store.tasks.find((t) => t.id === taskId);
    if (!task) {
      return { ok: false, error: `Task not found: ${taskId}` };
    }
    const subtask: SubTask = {
      id: uuidv4(),
      agentType: input.agentType,
      agentId: input.agentId,
      status: 'pending',
      notes: input.notes,
      createdAt: now(),
      updatedAt: now(),
    };
    task.subtasks.push(subtask);
    task.updatedAt = now();
    return { ok: true, value: subtask };
  });
}

export function updateSubTask(
  taskId: string,
  subtaskId: string,
  input: UpdateSubTaskInput
): Result<SubTask> {
  return withStore((store) => {
    const task = store.tasks.find((t) => t.id === taskId);
    if (!task) {
      return { ok: false, error: `Task not found: ${taskId}` };
    }
    const subtask = task.subtasks.find((s) => s.id === subtaskId);
    if (!subtask) {
      return { ok: false, error: `SubTask not found: ${subtaskId}` };
    }
    if (input.status !== undefined) subtask.status = input.status;
    if (input.agentId !== undefined) subtask.agentId = input.agentId;
    if (input.notes !== undefined) subtask.notes = input.notes;
    subtask.updatedAt = now();
    task.updatedAt = now();
    return { ok: true, value: subtask };
  });
}

export function deleteSubTask(taskId: string, subtaskId: string): Result<void> {
  return withStore((store) => {
    const task = store.tasks.find((t) => t.id === taskId);
    if (!task) {
      return { ok: false, error: `Task not found: ${taskId}` };
    }
    const idx = task.subtasks.findIndex((s) => s.id === subtaskId);
    if (idx === -1) {
      return { ok: false, error: `SubTask not found: ${subtaskId}` };
    }
    task.subtasks.splice(idx, 1);
    task.updatedAt = now();
    return { ok: true, value: undefined };
  });
}

export function listSubTasks(filter?: SubTaskFilter): SubTaskWithContext[] {
  const store = readStore();
  const results: SubTaskWithContext[] = [];
  for (const task of store.tasks) {
    for (const subtask of task.subtasks) {
      if (filter?.agentType !== undefined && subtask.agentType !== filter.agentType) continue;
      if (filter?.status !== undefined && subtask.status !== filter.status) continue;
      results.push({ taskId: task.id, taskTitle: task.title, subtask });
    }
  }
  return results;
}
