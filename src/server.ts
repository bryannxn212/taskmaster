import express, { type Request, type Response } from 'express';
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
import type { Result, TaskStatus } from './types.js';

const app = express();
app.use(express.json());

function sendResult<T>(res: Response, result: Result<T>, statusOnOk: number = 200): void {
  if (result.ok) {
    if (statusOnOk === 204) {
      res.status(204).end();
    } else {
      res.status(statusOnOk).json(result.value);
    }
  } else {
    const status = result.error.toLowerCase().includes('not found') ? 404 : 400;
    res.status(status).json({ error: result.error });
  }
}

// GET /tasks
app.get('/tasks', (req: Request, res: Response) => {
  const status = req.query['status'] as TaskStatus | undefined;
  const tasks = listTasks(status ? { status } : undefined);
  res.json(tasks);
});

// GET /tasks/next — must be before /tasks/:id
app.get('/tasks/next', (_req: Request, res: Response) => {
  const result = getNextTask();
  sendResult(res, result);
});

// GET /tasks/:id
app.get('/tasks/:id', (req: Request, res: Response) => {
  sendResult(res, getTask(req.params['id']!));
});

// POST /tasks
app.post('/tasks', (req: Request, res: Response) => {
  sendResult(res, addTask(req.body), 201);
});

// PATCH /tasks/:id
app.patch('/tasks/:id', (req: Request, res: Response) => {
  sendResult(res, updateTask(req.params['id']!, req.body));
});

// DELETE /tasks/:id
app.delete('/tasks/:id', (req: Request, res: Response) => {
  sendResult(res, deleteTask(req.params['id']!), 204);
});

// POST /tasks/:id/subtasks
app.post('/tasks/:id/subtasks', (req: Request, res: Response) => {
  sendResult(res, addSubTask(req.params['id']!, req.body), 201);
});

// PATCH /tasks/:id/subtasks/:sid
app.patch('/tasks/:id/subtasks/:sid', (req: Request, res: Response) => {
  sendResult(res, updateSubTask(req.params['id']!, req.params['sid']!, req.body));
});

// DELETE /tasks/:id/subtasks/:sid
app.delete('/tasks/:id/subtasks/:sid', (req: Request, res: Response) => {
  sendResult(res, deleteSubTask(req.params['id']!, req.params['sid']!), 204);
});

// GET /subtasks
app.get('/subtasks', (req: Request, res: Response) => {
  const agentType = req.query['agentType'] as string | undefined;
  const status = req.query['status'] as TaskStatus | undefined;
  const results = listSubTasks({ agentType, status });
  res.json(results);
});

if (process.env['NODE_ENV'] !== 'test') {
  const port = parseInt(process.env['PORT'] ?? '3000', 10);
  app.listen(port, () => {
    console.log(`Taskmaster API listening on port ${port}`);
  });
}

export default app;
