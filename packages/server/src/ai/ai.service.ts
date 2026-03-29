import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import type { AiSummaryRequest } from '@todo/shared';

@Injectable()
export class AiService {
  private client: Anthropic | null = null;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      this.client = new Anthropic({ apiKey });
    }
  }

  /** Check if AI features are available */
  isAvailable(): boolean {
    return this.client !== null;
  }

  /** Generate a motivational progress summary */
  async generateSummary(stats: AiSummaryRequest): Promise<string> {
    if (!this.client) {
      throw new ServiceUnavailableException('AI summary unavailable');
    }

    const message = await this.client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      messages: [
        {
          role: 'user',
          content: `You are a friendly productivity assistant. Given these task stats, write a brief 1-2 sentence motivational summary about the user's progress. Be encouraging and specific.

Stats:
- Total tasks: ${stats.total}
- Completed: ${stats.completed}
- Active: ${stats.active}
- High priority: ${stats.priorityBreakdown.high}
- Medium priority: ${stats.priorityBreakdown.medium}
- Low priority: ${stats.priorityBreakdown.low}

Respond with ONLY the motivational message, no preamble.`,
        },
      ],
    });

    const block = message.content[0];
    if (block.type === 'text') {
      return block.text;
    }
    return 'Great job on your progress today!';
  }
}
