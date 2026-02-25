#!/usr/bin/env node
import { Command } from 'commander';
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
} from './tasks.js';
import type { TaskStatus } from './types.js';

const program = new Command();

program.name('taskmaster').description('Task queue management system for AI agents').version('1.0.0');

// ─── task ────────────────────────────────────────────────────────────────────

const task = program.command('task');

task
  .command('add <title>')
  .description('Add a new task')
  .option('--desc <text>', 'Task description')
  .option('--priority <n>', 'Task priority (lower = higher priority)', '0')
  .action((title: string, opts: { desc?: string; priority: string }) => {
    const result = addTask({
      title,
      description: opts.desc,
      priority: parseInt(opts.priority, 10),
    });
    if (!result.ok) {
      process.stderr.write(`Error: ${result.error}\n`);
      process.exit(1);
    }
    console.log(`Task created: ${result.value.id}`);
    console.log(JSON.stringify(result.value, null, 2));
  });

task
  .command('list')
  .description('List tasks')
  .option('--status <status>', 'Filter by status')
  .option('--json', 'Output as JSON')
  .action((opts: { status?: string; json?: boolean }) => {
    const tasks = listTasks(opts.status ? { status: opts.status as TaskStatus } : undefined);
    if (opts.json) {
      console.log(JSON.stringify(tasks, null, 2));
    } else {
      if (tasks.length === 0) {
        console.log('No tasks found.');
      } else {
        for (const t of tasks) {
          console.log(`[${t.status}] (priority: ${t.priority}) ${t.id} — ${t.title}`);
        }
      }
    }
  });

task
  .command('next')
  .description('Get the next pending task')
  .option('--json', 'Output as JSON')
  .action((opts: { json?: boolean }) => {
    const result = getNextTask();
    if (!result.ok) {
      process.stderr.write(`Error: ${result.error}\n`);
      process.exit(1);
    }
    if (result.value === null) {
      console.log('No pending tasks.');
      process.exit(0);
    }
    if (opts.json) {
      console.log(JSON.stringify(result.value, null, 2));
    } else {
      const t = result.value;
      console.log(`[${t.status}] (priority: ${t.priority}) ${t.id} — ${t.title}`);
    }
  });

task
  .command('get <id>')
  .description('Get a task by ID')
  .option('--json', 'Output as JSON')
  .action((id: string, opts: { json?: boolean }) => {
    const result = getTask(id);
    if (!result.ok) {
      process.stderr.write(`Error: ${result.error}\n`);
      process.exit(1);
    }
    if (opts.json) {
      console.log(JSON.stringify(result.value, null, 2));
    } else {
      const t = result.value;
      console.log(`[${t.status}] (priority: ${t.priority}) ${t.id} — ${t.title}`);
      if (t.description) console.log(`  ${t.description}`);
      if (t.subtasks.length > 0) {
        console.log(`  Subtasks (${t.subtasks.length}):`);
        for (const s of t.subtasks) {
          console.log(`    [${s.status}] ${s.id} — ${s.agentType}${s.agentId ? ` (${s.agentId})` : ''}`);
        }
      }
    }
  });

task
  .command('update <id>')
  .description('Update a task')
  .option('--status <s>', 'New status')
  .option('--priority <n>', 'New priority')
  .option('--desc <text>', 'New description')
  .action((id: string, opts: { status?: string; priority?: string; desc?: string }) => {
    const result = updateTask(id, {
      status: opts.status as TaskStatus | undefined,
      priority: opts.priority !== undefined ? parseInt(opts.priority, 10) : undefined,
      description: opts.desc,
    });
    if (!result.ok) {
      process.stderr.write(`Error: ${result.error}\n`);
      process.exit(1);
    }
    console.log(`Task updated: ${result.value.id}`);
    console.log(JSON.stringify(result.value, null, 2));
  });

task
  .command('delete <id>')
  .description('Delete a task')
  .action((id: string) => {
    const result = deleteTask(id);
    if (!result.ok) {
      process.stderr.write(`Error: ${result.error}\n`);
      process.exit(1);
    }
    console.log(`Task deleted: ${id}`);
  });

// ─── subtask ─────────────────────────────────────────────────────────────────

const subtask = program.command('subtask');

subtask
  .command('add <taskId> <agentType>')
  .description('Add a subtask to a task')
  .option('--agentId <id>', 'Agent ID')
  .option('--notes <text>', 'Notes')
  .action((taskId: string, agentType: string, opts: { agentId?: string; notes?: string }) => {
    const result = addSubTask(taskId, { agentType, agentId: opts.agentId, notes: opts.notes });
    if (!result.ok) {
      process.stderr.write(`Error: ${result.error}\n`);
      process.exit(1);
    }
    console.log(`SubTask created: ${result.value.id}`);
    console.log(JSON.stringify(result.value, null, 2));
  });

subtask
  .command('list')
  .description('List subtasks across all tasks')
  .option('--agentType <type>', 'Filter by agent type')
  .option('--status <status>', 'Filter by status')
  .option('--json', 'Output as JSON')
  .action((opts: { agentType?: string; status?: string; json?: boolean }) => {
    const results = listSubTasks({
      agentType: opts.agentType,
      status: opts.status as TaskStatus | undefined,
    });
    if (opts.json) {
      console.log(JSON.stringify(results, null, 2));
    } else {
      if (results.length === 0) {
        console.log('No subtasks found.');
      } else {
        for (const { taskId, taskTitle, subtask: s } of results) {
          console.log(
            `[${s.status}] ${s.id} — ${s.agentType}${s.agentId ? ` (${s.agentId})` : ''} | task: ${taskTitle} (${taskId})`
          );
        }
      }
    }
  });

subtask
  .command('update <taskId> <subtaskId>')
  .description('Update a subtask')
  .option('--status <status>', 'New status')
  .option('--notes <text>', 'New notes')
  .action((taskId: string, subtaskId: string, opts: { status?: string; notes?: string }) => {
    const result = updateSubTask(taskId, subtaskId, {
      status: opts.status as TaskStatus | undefined,
      notes: opts.notes,
    });
    if (!result.ok) {
      process.stderr.write(`Error: ${result.error}\n`);
      process.exit(1);
    }
    console.log(`SubTask updated: ${result.value.id}`);
    console.log(JSON.stringify(result.value, null, 2));
  });

subtask
  .command('delete <taskId> <subtaskId>')
  .description('Delete a subtask')
  .action((taskId: string, subtaskId: string) => {
    const result = deleteSubTask(taskId, subtaskId);
    if (!result.ok) {
      process.stderr.write(`Error: ${result.error}\n`);
      process.exit(1);
    }
    console.log(`SubTask deleted: ${subtaskId}`);
  });

// ─── serve ───────────────────────────────────────────────────────────────────

program
  .command('serve')
  .description('Start the REST API server')
  .option('--port <n>', 'Port to listen on', '3000')
  .action(async (opts: { port: string }) => {
    process.env['PORT'] = opts.port;
    await import('./server.js');
  });

program.parse(process.argv);
