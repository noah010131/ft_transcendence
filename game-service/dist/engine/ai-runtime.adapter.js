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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiRuntimeAdapter = void 0;
const common_1 = require("@nestjs/common");
const ai_bot_service_1 = require("./ai-bot.service");
const game_engine_service_1 = require("./game-engine.service");
let AiRuntimeAdapter = class AiRuntimeAdapter {
    constructor(aiBot, engine) {
        this.aiBot = aiBot;
        this.engine = engine;
        this.baseDecisionIntervalMs = 180;
        this.intervalJitterMs = 50;
        this.decisionSkipChance = 0.20;
        this.decisionState = new Map();
    }
    applyAiInputIfNeeded(state, p2UserId) {
        if (!this.isAiUser(p2UserId)) {
            return state;
        }
        const now = Date.now();
        const memory = this.decisionState.get(p2UserId) ?? {
            nextDecisionAt: 0,
            lastDirection: 'none',
        };
        if (now >= memory.nextDecisionAt) {
            memory.nextDecisionAt = now + this.nextIntervalMs();
            if (Math.random() < this.decisionSkipChance) {
                memory.lastDirection = 'none';
            }
            else {
                memory.lastDirection = this.aiBot.decideDirection({
                    state,
                    paddleY: state.p2Y,
                });
            }
            this.decisionState.set(p2UserId, memory);
        }
        const direction = memory.lastDirection;
        if (direction === 'none') {
            return state;
        }
        return this.engine.movePaddle(state, 'p2', direction);
    }
    isAiUser(userId) {
        return userId.startsWith('AI_BOT_');
    }
    nextIntervalMs() {
        return this.baseDecisionIntervalMs + Math.floor(Math.random() * (this.intervalJitterMs + 1));
    }
};
exports.AiRuntimeAdapter = AiRuntimeAdapter;
exports.AiRuntimeAdapter = AiRuntimeAdapter = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [ai_bot_service_1.AiBotService,
        game_engine_service_1.GameEngineService])
], AiRuntimeAdapter);
//# sourceMappingURL=ai-runtime.adapter.js.map