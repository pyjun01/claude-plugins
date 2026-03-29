/** Priority levels for tasks */
export type Priority = 'low' | 'medium' | 'high';

/** Task entity */
export interface Task {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
  priority: Priority;
}

/** Filter options for listing tasks */
export type TaskFilter = 'all' | 'active' | 'completed';

/** Sort order for listing tasks */
export type SortOrder = 'asc' | 'desc';

/** Request body for creating a task */
export interface CreateTaskDto {
  title: string;
  priority?: Priority;
}

/** Request body for updating a task */
export interface UpdateTaskDto {
  title?: string;
  priority?: Priority;
}

/** Meta information included in list responses */
export interface TaskListMeta {
  total: number;
  activeCount: number;
  completedCount: number;
}

/** Response shape for listing tasks */
export interface TaskListResponse {
  items: Task[];
  meta: TaskListMeta;
}

/** Response shape for task stats/summary */
export interface TaskStats {
  total: number;
  activeCount: number;
  completedCount: number;
}

/** Error response shape */
export interface ErrorResponse {
  message: string;
}

/** AI summary request body */
export interface AiSummaryRequest {
  total: number;
  completed: number;
  active: number;
  priorityBreakdown: {
    high: number;
    medium: number;
    low: number;
  };
}

/** AI summary response */
export interface AiSummaryResponse {
  summary: string;
}

/** API endpoint paths */
export const API_PATHS = {
  TASKS: '/tasks',
  TASK_BY_ID: '/tasks/:id',
  TASK_TOGGLE: '/tasks/:id/toggle',
  TASKS_COMPLETED: '/tasks/completed',
  TASKS_STATS: '/tasks/stats',
  AI_SUMMARY: '/ai/summary',
} as const;
