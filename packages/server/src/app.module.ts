import { Module } from '@nestjs/common';
import { TasksModule } from './tasks/tasks.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [TasksModule, AiModule],
})
export class AppModule {}
