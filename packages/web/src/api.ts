import type {
  Task,
  CreateTaskDto,
  UpdateTaskDto,
  TaskListResponse,
  TaskFilter,
  SortOrder,
  TaskStats,
  AiSummaryRequest,
  AiSummaryResponse,
} from 'shared/types';

const BASE = '';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(body.message || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function fetchTasks(
  filter: TaskFilter = 'all',
  sort: SortOrder = 'desc',
): Promise<TaskListResponse> {
  const params = new URLSearchParams({ filter, sort });
  return request<TaskListResponse>(`/tasks?${params}`);
}

export function createTask(dto: CreateTaskDto): Promise<Task> {
  return request<Task>('/tasks', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export function toggleTask(id: string): Promise<Task> {
  return request<Task>(`/tasks/${id}/toggle`, { method: 'PATCH' });
}

export function updateTask(id: string, dto: UpdateTaskDto): Promise<Task> {
  return request<Task>(`/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(dto),
  });
}

export function deleteTask(id: string): Promise<void> {
  return request<void>(`/tasks/${id}`, { method: 'DELETE' });
}

export function deleteCompleted(): Promise<void> {
  return request<void>('/tasks/completed', { method: 'DELETE' });
}

export function fetchStats(): Promise<TaskStats> {
  return request<TaskStats>('/tasks/stats');
}

export function fetchAiSummary(data: AiSummaryRequest): Promise<AiSummaryResponse> {
  return request<AiSummaryResponse>('/ai/summary', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
