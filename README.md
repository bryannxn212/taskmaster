# Taskmaster

A task queue management system for AI agents. Exposes a CLI, a REST API, and a programmatic TypeScript library, all backed by a single JSON file.

---

## Table of Contents

- [Installation](#installation)
- [Configuration](#configuration)
- [Data Model](#data-model)
- [CLI](#cli)
  - [task add](#task-add)
  - [task list](#task-list)
  - [task next](#task-next)
  - [task get](#task-get)
  - [task update](#task-update)
  - [task delete](#task-delete)
  - [subtask add](#subtask-add)
  - [subtask list](#subtask-list)
  - [subtask update](#subtask-update)
  - [subtask delete](#subtask-delete)
  - [serve](#serve)
- [REST API](#rest-api)
  - [Tasks](#tasks)
  - [Subtasks](#subtasks)
- [Library Usage](#library-usage)
- [Queue Ordering](#queue-ordering)
- [Development](#development)
- [Testing](#testing)
- [Project Structure](#project-structure)

---

## Installation

**As a global CLI tool** (after building):

```bash
npm install
npm run build
npm link
taskmaster --help
```

**As a library** in another project:

```bash
npm install /path/to/taskmaster
```

```typescript
import { addTask, getNextTask } from 'taskmaster';
```

---

## Configuration

| Environment variable | Default      | Description                          |
|----------------------|--------------|--------------------------------------|
| `TASKMASTER_FILE`    | `tasks.json` | Path to the JSON storage file        |
| `PORT`               | `3000`       | Port the REST API server listens on  |

The storage file is created automatically on first write.

---

## Data Model

### Task

| Field         | Type         | Description                                              |
|---------------|--------------|----------------------------------------------------------|
| `id`          | `string`     | UUID v4                                                  |
| `title`       | `string`     | Short title                                              |
| `description` | `string?`    | Optional longer description                              |
| `status`      | `TaskStatus` | `pending` \| `in_progress` \| `completed` \| `cancelled` |
| `priority`    | `number`     | Lower number = higher priority. Default: `0`             |
| `subtasks`    | `SubTask[]`  | Ordered list of subtasks                                 |
| `createdAt`   | `string`     | ISO 8601 timestamp                                       |
| `updatedAt`   | `string`     | ISO 8601 timestamp, updated on every mutation            |

### SubTask

| Field       | Type         | Description                                              |
|-------------|--------------|----------------------------------------------------------|
| `id`                | `string`     | UUID v4                                                  |
| `agentType`         | `string`     | Agent category, e.g. `planning`, `implementation`        |
| `agentId`           | `string?`    | Optional identifier of the specific agent instance       |
| `status`            | `TaskStatus` | `pending` \| `in_progress` \| `completed` \| `cancelled` |
| `goal`              | `string?`    | What the agent is trying to achieve                      |
| `constraints`       | `string?`    | Boundaries or restrictions the agent must respect        |
| `outputFormat`      | `string?`    | Expected shape or format of the agent's output           |
| `failureConditions` | `string?`    | Conditions that constitute failure for this subtask      |
| `notes`             | `string?`    | Optional free-text notes                                 |
| `createdAt`         | `string`     | ISO 8601 timestamp                                       |
| `updatedAt`         | `string`     | ISO 8601 timestamp                                       |

---

## CLI

Run in development with:

```bash
npx tsx src/cli.ts <command>
```

Or after installing globally:

```bash
taskmaster <command>
```

---

### task add

Create a new task.

```
taskmaster task add <title> [options]

Options:
  --desc <text>      Task description
  --priority <n>     Priority (lower = higher priority)  [default: 0]
```

**Examples:**

```bash
taskmaster task add "Process user reports"
taskmaster task add "Deploy hotfix" --priority 1 --desc "Critical security patch"
```

**Output:**

```
Task created: 3f2a1b4c-...
{
  "id": "3f2a1b4c-...",
  "title": "Process user reports",
  "status": "pending",
  "priority": 0,
  ...
}
```

---

### task list

List all tasks, with optional status filter.

```
taskmaster task list [options]

Options:
  --status <status>   Filter by status (pending | in_progress | completed | cancelled)
  --json              Output raw JSON array
```

**Examples:**

```bash
taskmaster task list
taskmaster task list --status pending
taskmaster task list --json
```

---

### task next

Get the highest-priority pending task. See [Queue Ordering](#queue-ordering) for tie-breaking rules.

```
taskmaster task next [options]

Options:
  --json   Output raw JSON
```

**Examples:**

```bash
taskmaster task next
taskmaster task next --json
```

---

### task get

Fetch a single task by ID.

```
taskmaster task get <id> [options]

Options:
  --json   Output raw JSON
```

**Examples:**

```bash
taskmaster task get 3f2a1b4c-...
taskmaster task get 3f2a1b4c-... --json
```

---

### task update

Update one or more fields on a task.

```
taskmaster task update <id> [options]

Options:
  --status <status>    New status
  --priority <n>       New priority
  --desc <text>        New description
```

**Examples:**

```bash
taskmaster task update 3f2a1b4c-... --status in_progress
taskmaster task update 3f2a1b4c-... --priority 2 --desc "Updated scope"
```

---

### task delete

Permanently remove a task (including all its subtasks).

```
taskmaster task delete <id>
```

**Example:**

```bash
taskmaster task delete 3f2a1b4c-...
```

---

### subtask add

Add a subtask to an existing task.

```
taskmaster subtask add <taskId> <agentType> [options]

Options:
  --agentId <id>     Agent instance identifier
  --notes <text>     Initial notes
```

**Examples:**

```bash
taskmaster subtask add 3f2a1b4c-... planning
taskmaster subtask add 3f2a1b4c-... implementation --agentId agent-42 --notes "Assigned"
```

---

### subtask list

List subtasks across all tasks, with optional filters.

```
taskmaster subtask list [options]

Options:
  --agentType <type>   Filter by agent type
  --status <status>    Filter by status
  --json               Output raw JSON
```

**Examples:**

```bash
taskmaster subtask list
taskmaster subtask list --agentType planning --status pending
taskmaster subtask list --json
```

---

### subtask update

Update a subtask's status, notes, or agent ID.

```
taskmaster subtask update <taskId> <subtaskId> [options]

Options:
  --status <status>   New status
  --notes <text>      New notes
```

**Example:**

```bash
taskmaster subtask update 3f2a1b4c-... 8a9b0c1d-... --status completed --notes "Done"
```

---

### subtask delete

Remove a subtask from its parent task.

```
taskmaster subtask delete <taskId> <subtaskId>
```

**Example:**

```bash
taskmaster subtask delete 3f2a1b4c-... 8a9b0c1d-...
```

---

### serve

Start the REST API server.

```
taskmaster serve [options]

Options:
  --port <n>   Port to listen on  [default: 3000]
```

**Example:**

```bash
taskmaster serve --port 8080
```

---

## REST API

Start the server with `taskmaster serve` or `npx tsx src/server.ts`.

All request bodies and responses use JSON (`Content-Type: application/json`).

Error responses have the shape:

```json
{ "error": "Task not found: <id>" }
```

Status codes: `400` for bad input, `404` when the resource is not found.

---

### Tasks

#### `GET /tasks`

List all tasks. Optionally filter by `status` or `priority`.

**Query parameters:**

| Parameter  | Type         | Description          |
|------------|--------------|----------------------|
| `status`   | `TaskStatus` | Filter by status     |
| `priority` | `number`     | Filter by priority   |

**Example:**

```
GET /tasks?status=pending
```

**Response:** `200 OK` — array of `Task` objects.

---

#### `GET /tasks/next`

Get the next pending task according to queue ordering rules. Returns `null` if no pending tasks exist.

**Response:** `200 OK` — a `Task` object or `null`.

---

#### `GET /tasks/:id`

Get a single task by ID.

**Response:** `200 OK` — a `Task` object, or `404` if not found.

---

#### `POST /tasks`

Create a new task.

**Request body:**

| Field         | Type     | Required | Description          |
|---------------|----------|----------|----------------------|
| `title`       | `string` | Yes      | Task title           |
| `description` | `string` | No       | Task description     |
| `priority`    | `number` | No       | Priority (default 0) |

**Response:** `201 Created` — the created `Task` object.

---

#### `PATCH /tasks/:id`

Update a task's fields. Only include fields you want to change.

**Request body:**

| Field         | Type         | Description         |
|---------------|--------------|---------------------|
| `title`       | `string`     | New title           |
| `description` | `string`     | New description     |
| `status`      | `TaskStatus` | New status          |
| `priority`    | `number`     | New priority        |

**Response:** `200 OK` — the updated `Task` object, or `404` if not found.

---

#### `DELETE /tasks/:id`

Delete a task and all its subtasks.

**Response:** `204 No Content`, or `404` if not found.

---

### Subtasks

#### `GET /subtasks`

List subtasks across all tasks. Returns each subtask alongside its parent task context.

**Query parameters:**

| Parameter   | Type         | Description           |
|-------------|--------------|-----------------------|
| `agentType` | `string`     | Filter by agent type  |
| `status`    | `TaskStatus` | Filter by status      |

**Response:** `200 OK` — array of `SubTaskWithContext` objects:

```json
[
  {
    "taskId": "3f2a1b4c-...",
    "taskTitle": "Process user reports",
    "subtask": { ... }
  }
]
```

---

#### `POST /tasks/:id/subtasks`

Add a subtask to a task.

**Request body:**

| Field               | Type     | Required | Description                              |
|---------------------|----------|----------|------------------------------------------|
| `agentType`         | `string` | Yes      | Agent category                           |
| `agentId`           | `string` | No       | Agent instance ID                        |
| `goal`              | `string` | No       | What the agent is trying to achieve      |
| `constraints`       | `string` | No       | Boundaries the agent must respect        |
| `outputFormat`      | `string` | No       | Expected shape or format of the output   |
| `failureConditions` | `string` | No       | Conditions that constitute failure       |
| `notes`             | `string` | No       | Initial notes                            |

**Response:** `201 Created` — the created `SubTask` object, or `404` if task not found.

---

#### `PATCH /tasks/:id/subtasks/:sid`

Update a subtask.

**Request body:**

| Field               | Type         | Description                        |
|---------------------|--------------|------------------------------------|
| `status`            | `TaskStatus` | New status                         |
| `agentId`           | `string`     | New agent ID                       |
| `goal`              | `string`     | New goal                           |
| `constraints`       | `string`     | New constraints                    |
| `outputFormat`      | `string`     | New output format                  |
| `failureConditions` | `string`     | New failure conditions             |
| `notes`             | `string`     | New notes                          |

**Response:** `200 OK` — the updated `SubTask` object, or `404` if task or subtask not found.

---

#### `DELETE /tasks/:id/subtasks/:sid`

Remove a subtask from its parent task.

**Response:** `204 No Content`, or `404` if task or subtask not found.

---

## Library Usage

Taskmaster can be imported as a TypeScript/ESM library.

```typescript
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
} from 'taskmaster';
```

All mutating functions return a `Result<T>`:

```typescript
type Result<T> = { ok: true; value: T } | { ok: false; error: string };
```

**Example — agent work loop:**

```typescript
import { getNextTask, updateTask, addSubTask, updateSubTask } from 'taskmaster';

const result = getNextTask();
if (!result.ok || result.value === null) process.exit(0);

const task = result.value;

// Claim the task
updateTask(task.id, { status: 'in_progress' });

// Record subtask work
const sub = addSubTask(task.id, { agentType: 'implementation', agentId: 'agent-1' });
if (sub.ok) {
  // ... do work ...
  updateSubTask(task.id, sub.value.id, { status: 'completed', notes: 'Finished' });
}

updateTask(task.id, { status: 'completed' });
```

You can also control storage directly:

```typescript
import { readStore, writeStore, withStore } from 'taskmaster';

// Point to a custom file
process.env['TASKMASTER_FILE'] = '/var/data/my-tasks.json';

const store = readStore(); // { tasks: Task[] }
```

---

## Queue Ordering

`getNextTask()` and `GET /tasks/next` select among all `pending` tasks using these rules:

1. **Priority ascending** — lower `priority` value wins
2. **`createdAt` ascending** — among equal priorities, the older task wins

Only tasks with `status === 'pending'` are considered.

---

## Development

```bash
# Install dependencies
npm install

# Run the CLI via tsx (no build step needed)
npx tsx src/cli.ts task list

# Start the API server in dev mode
npx tsx src/server.ts

# Build to dist/
npm run build

# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

---

## Testing

The test suite uses [Vitest](https://vitest.dev/) and [supertest](https://github.com/ladjs/supertest). Each test gets an isolated temporary file via `TASKMASTER_FILE`, so tests never share state.

```
tests/
  store.test.ts    — unit tests for readStore / writeStore / withStore
  tasks.test.ts    — unit tests for all business logic functions
  server.test.ts   — integration tests for all REST endpoints
```

```bash
npm test                              # run all tests once
npm run test:watch                    # re-run on file changes
npm test -- --reporter=verbose        # show individual test names
```

---

## Project Structure

```
taskmaster/
├── src/
│   ├── types.ts      — interfaces, DTOs, Result<T>
│   ├── store.ts      — readStore / writeStore / withStore (JSON I/O)
│   ├── tasks.ts      — business logic
│   ├── cli.ts        — commander v12 CLI
│   └── server.ts     — express v4 REST API
├── tests/
│   ├── store.test.ts
│   ├── tasks.test.ts
│   └── server.test.ts
├── index.ts          — public re-exports for library consumers
├── vitest.config.ts
├── tsconfig.json
└── package.json
```
