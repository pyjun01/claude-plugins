import { TasksService } from './tasks.service';
import type { TaskFilter } from '@todo/shared';
export declare class TasksController {
    private readonly tasksService;
    constructor(tasksService: TasksService);
    create(body: {
        title: string;
        priority?: string;
    }): import("@todo/shared").Task;
    list(filter?: TaskFilter, sort?: 'asc' | 'desc'): import("@todo/shared").TaskListResponse;
    getStats(): import("@todo/shared").TaskStats;
    getById(id: string): import("@todo/shared").Task;
    toggle(id: string): import("@todo/shared").Task;
    update(id: string, body: {
        title?: string;
        priority?: string;
    }): import("@todo/shared").Task;
    deleteCompleted(): void;
    delete(id: string): void;
}
