import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import type { TaskFilter } from '@todo/shared';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  /** Create a new task */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: { title: string; priority?: string }) {
    return this.tasksService.create(body.title, body.priority);
  }

  /** List all tasks with optional filters */
  @Get()
  list(
    @Query('filter') filter?: TaskFilter,
    @Query('sort') sort?: 'asc' | 'desc',
  ) {
    return this.tasksService.list(filter || 'all', sort || 'desc');
  }

  /** Get task summary stats */
  @Get('stats')
  getStats() {
    return this.tasksService.getStats();
  }

  /** Get a single task by ID */
  @Get(':id')
  getById(@Param('id') id: string) {
    return this.tasksService.getById(id);
  }

  /** Toggle task completion */
  @Patch(':id/toggle')
  toggle(@Param('id') id: string) {
    return this.tasksService.toggle(id);
  }

  /** Update task title/priority */
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: { title?: string; priority?: string }) {
    return this.tasksService.update(id, body.title, body.priority);
  }

  /** Delete all completed tasks */
  @Delete('completed')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteCompleted() {
    this.tasksService.deleteCompleted();
  }

  /** Delete a single task */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string) {
    this.tasksService.delete(id);
  }
}
