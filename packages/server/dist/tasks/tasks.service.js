"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TasksService = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
const VALID_PRIORITIES = ['low', 'medium', 'high'];
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let TasksService = class TasksService {
    constructor() {
        this.tasks = new Map();
    }
    validateId(id) {
        if (!UUID_REGEX.test(id)) {
            throw new common_1.BadRequestException('Invalid task ID');
        }
    }
    validateTitle(title, required) {
        if (required && (title === undefined || title === null)) {
            throw new common_1.BadRequestException('Title must not be empty');
        }
        if (title !== undefined) {
            const trimmed = title.trim();
            if (trimmed.length === 0) {
                throw new common_1.BadRequestException('Title must not be empty');
            }
            if (trimmed.length > 200) {
                throw new common_1.BadRequestException('Title must be 200 characters or fewer');
            }
            return trimmed;
        }
        return undefined;
    }
    validatePriority(priority) {
        if (priority !== undefined) {
            if (!VALID_PRIORITIES.includes(priority)) {
                throw new common_1.BadRequestException('Priority must be one of: low, medium, high');
            }
            return priority;
        }
        return undefined;
    }
    create(title, priority) {
        const validatedTitle = this.validateTitle(title, true);
        const validatedPriority = this.validatePriority(priority) ?? 'medium';
        const now = new Date().toISOString();
        const task = {
            id: (0, uuid_1.v4)(),
            title: validatedTitle,
            completed: false,
            createdAt: now,
            updatedAt: now,
            priority: validatedPriority,
        };
        this.tasks.set(task.id, task);
        return task;
    }
    list(filter = 'all', sort = 'desc') {
        let items = Array.from(this.tasks.values());
        if (filter === 'active') {
            items = items.filter((t) => !t.completed);
        }
        else if (filter === 'completed') {
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
    getById(id) {
        this.validateId(id);
        const task = this.tasks.get(id);
        if (!task) {
            throw new common_1.NotFoundException('Task not found');
        }
        return task;
    }
    toggle(id) {
        const task = this.getById(id);
        task.completed = !task.completed;
        task.updatedAt = new Date().toISOString();
        return task;
    }
    update(id, title, priority) {
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
    delete(id) {
        const task = this.getById(id);
        this.tasks.delete(task.id);
    }
    deleteCompleted() {
        for (const [id, task] of this.tasks) {
            if (task.completed) {
                this.tasks.delete(id);
            }
        }
    }
    getStats() {
        const allTasks = Array.from(this.tasks.values());
        return {
            total: allTasks.length,
            activeCount: allTasks.filter((t) => !t.completed).length,
            completedCount: allTasks.filter((t) => t.completed).length,
        };
    }
};
exports.TasksService = TasksService;
exports.TasksService = TasksService = __decorate([
    (0, common_1.Injectable)()
], TasksService);
//# sourceMappingURL=tasks.service.js.map