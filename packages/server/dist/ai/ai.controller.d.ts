import { AiService } from './ai.service';
import type { AiSummaryRequest } from '@todo/shared';
export declare class AiController {
    private readonly aiService;
    constructor(aiService: AiService);
    summary(body: AiSummaryRequest): Promise<{
        summary: string;
    }>;
}
