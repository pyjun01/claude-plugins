import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import type { Task, Priority, TaskFilter, TaskListResponse, TaskStats } from '@todo/shared';

const VALID_PRIORITIES: Priority[] = ['low', 'medium', 'high'];
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class TasksService {
  private tasks: Map<string, Task> = new Map();

  /** Validate a UUID string */
  private validateId(id: string): void {
    if (!UUID_REGEX.test(id)) {
      throw new BadRequestException('Invalid task ID');
    }
  }

  /** Validate task title */
  private validateTitle(title: string | undefined, required: boolean): string | undefined {
    if (required && (title === undefined || title === null)) {
      throw new BadRequestException('Title must not be empty');
    }
    if (title !== undefined) {
      const trimmed = title.trim();
      if (trimmed.length === 0) {
        throw new BadRequestException('Title must not be empty');
      }
      if (trimmed.length > 200) {
        throw new BadRequestException('Title must be 200 characters or fewer');
      }
      return trimmed;
    }
    return undefined;
  }

  /** Validate priority value */
  private validatePriority(priority: string | undefined): Priority | undefined {
    if (priority !== undefined) {
      if (!VALID_PRIORITIES.includes(priority as Priority)) {
        throw new BadRequestException('Priority must be one of: low, medium, high');
      }
      return priority as Priority;
    }
    return undefined;
  }

  /** Create a new task */
  create(title: string, priority?: string): Task {
    const validatedTitle = this.validateTitle(title, true)!;
    const validatedPriority = this.validatePriority(priority) ?? 'medium';
    const now = new Date().toISOString();
    const task: Task = {
      id: uuidv4(),
      title: validatedTitle,
      completed: false,
      createdAt: now,
      updatedAt: now,
      priority: validatedPriority,
    };
    this.tasks.set(task.id, task);
    return task;
  }

  /** List tasks with optional filtering and sorting */
  list(filter: TaskFilter = 'all', sort: 'asc' | 'desc' = 'desc'): TaskListResponse {
    let items = Array.from(this.tasks.values());

    if (filter === 'active') {
      items = items.filter((t) => !t.completed);
    } else if (filter === 'completed') {
      items = items.filter((t) => t.completed);
    }

    items.sort((a, b) => {
      const cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sort === 'desc' ? -cmp : cmp;
    });

    const allTasks = Array.from(this.tasks.values());
    const meta = {
      total: allTasks.length,
      activeCount: allTasks.filter((t) => !t.completed).length,
      completedCount: allTasks.filter((t) => t.completed).length,
    };

    return { items, meta };
  }

  /** Get a single task by ID */
  getById(id: string): Task {
    this.validateId(id);
    const task = this.tasks.get(id);
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    return task;
  }

  /** Toggle task completion status */
  toggle(id: string): Task {
    const task = this.getById(id);
    task.completed = !task.completed;
    task.updatedAt = new Date().toISOString();
    return task;
  }

  /** Update task title and/or priority */
  update(id: string, title?: string, priority?: string): Task {
    const task = this.getById(id);
    const validatedTitle = this.validateTitle(title, false);
    const validatedPriority = this.validatePriority(priority);

    if (validatedTitle !== undefined) {
      task.title = validatedTitle;
    }
    if (validatedPriority !== undefined) {
      task.priority = validatedPriority;
    }
    task.updatedAt = new Date().toISOString();
    return task;
  }

  /** Delete a single task */
  delete(id: string): void {
    const task = this.getById(id);
    this.tasks.delete(task.id);
  }

  /** Delete all completed tasks */
  deleteCompleted(): void {
    for (const [id, task] of this.tasks) {
      if (task.completed) {
        this.tasks.delete(id);
      }
    }
  }

  /** Get summary statistics */
  getStats(): TaskStats {
    const allTasks = Array.from(this.tasks.values());
    return {
      total: allTasks.length,
      activeCount: allTasks.filter((t) => !t.completed).length,
      completedCount: allTasks.filter((t) => t.completed).length,
    };
  }
}
