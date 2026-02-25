export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type AgentType = 'planning' | 'implementation' | 'testing' | 'documentation' | (string & {});

export interface SubTask {
  id: string;
  agentType: AgentType;
  agentId?: string;
  status: TaskStatus;
  goal?: string;
  constraints?: string;
  outputFormat?: string;
  failureConditions?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: number;
  subtasks: SubTask[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskStore {
  tasks: Task[];
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

// Input DTOs
export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: number;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: number;
}

export interface CreateSubTaskInput {
  agentType: AgentType;
  agentId?: string;
  goal?: string;
  constraints?: string;
  outputFormat?: string;
  failureConditions?: string;
  notes?: string;
}

export interface UpdateSubTaskInput {
  status?: TaskStatus;
  agentId?: string;
  goal?: string;
  constraints?: string;
  outputFormat?: string;
  failureConditions?: string;
  notes?: string;
}

export interface TaskFilter {
  status?: TaskStatus;
  priority?: number;
}

export interface SubTaskFilter {
  agentType?: AgentType;
  status?: TaskStatus;
}

export interface SubTaskWithContext {
  taskId: string;
  taskTitle: string;
  subtask: SubTask;
}
