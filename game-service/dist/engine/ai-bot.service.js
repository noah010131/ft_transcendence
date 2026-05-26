"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiBotService = void 0;
const common_1 = require("@nestjs/common");
const game_engine_constants_1 = require("./game-engine.constants");
let AiBotService = class AiBotService {
    decideDirection(context) {
        const { state, paddleY } = context;
        const paddleCenterY = paddleY + game_engine_constants_1.PADDLE_HEIGHT / 2;
        const targetY = this.predictImpactY(state.ballX, state.ballY, state.ballVx, state.ballVy);
        const deadZone = game_engine_constants_1.PADDLE_SPEED * 0.80;
        if (Math.abs(targetY - paddleCenterY) <= deadZone) {
            return 'none';
        }
        return targetY < paddleCenterY ? 'up' : 'down';
    }
    predictImpactY(ballX, ballY, ballVx, ballVy) {
        const rightPaddleLeftX = game_engine_constants_1.BOARD_WIDTH - game_engine_constants_1.PADDLE_MARGIN - game_engine_constants_1.PADDLE_WIDTH;
        const targetX = rightPaddleLeftX - game_engine_constants_1.BALL_RADIUS;
        if (ballVx <= 0) {
            return ballY;
        }
        const timeToImpact = (targetX - ballX) / ballVx;
        if (timeToImpact <= 0) {
            return ballY;
        }
        const travelHeight = game_engine_constants_1.BOARD_HEIGHT - game_engine_constants_1.BALL_RADIUS * 2;
        const rawY = (ballY - game_engine_constants_1.BALL_RADIUS) + ballVy * timeToImpact;
        const period = travelHeight * 2;
        let wrapped = rawY % period;
        if (wrapped < 0)
            wrapped += period;
        const reflected = wrapped <= travelHeight ? wrapped : period - wrapped;
        return reflected + game_engine_constants_1.BALL_RADIUS;
    }
};
exports.AiBotService = AiBotService;
exports.AiBotService = AiBotService = __decorate([
    (0, common_1.Injectable)()
], AiBotService);
//# sourceMappingURL=ai-bot.service.js.map