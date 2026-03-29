"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiService = void 0;
const common_1 = require("@nestjs/common");
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
let AiService = class AiService {
    constructor() {
        this.client = null;
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (apiKey) {
            this.client = new sdk_1.default({ apiKey });
        }
    }
    isAvailable() {
        return this.client !== null;
    }
    async generateSummary(stats) {
        if (!this.client) {
            throw new common_1.ServiceUnavailableException('AI summary unavailable');
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
};
exports.AiService = AiService;
exports.AiService = AiService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], AiService);
//# sourceMappingURL=ai.service.js.map