import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AiService } from './ai.service';
import type { AiSummaryRequest } from '@todo/shared';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  /** Generate AI progress summary */
  @Post('summary')
  @HttpCode(HttpStatus.OK)
  async summary(@Body() body: AiSummaryRequest) {
    const summary = await this.aiService.generateSummary(body);
    return { summary };
  }
}
