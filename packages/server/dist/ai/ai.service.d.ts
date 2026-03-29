import type { AiSummaryRequest } from '@todo/shared';
export declare class AiService {
    private client;
    constructor();
    isAvailable(): boolean;
    generateSummary(stats: AiSummaryRequest): Promise<string>;
}
