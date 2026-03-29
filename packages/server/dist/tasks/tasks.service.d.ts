import type { Task, TaskFilter, TaskListResponse, TaskStats } from '@todo/shared';
export declare class TasksService {
    private tasks;
    private validateId;
    private validateTitle;
    private validatePriority;
    create(title: string, priority?: string): Task;
    list(filter?: TaskFilter, sort?: 'asc' | 'desc'): TaskListResponse;
    getById(id: string): Task;
    toggle(id: string): Task;
    update(id: string, title?: string, priority?: string): Task;
    delete(id: string): void;
    deleteCompleted(): void;
    getStats(): TaskStats;
}
