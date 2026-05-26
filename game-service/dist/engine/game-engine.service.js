"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameEngineService = void 0;
const common_1 = require("@nestjs/common");
const game_engine_constants_1 = require("./game-engine.constants");
let GameEngineService = class GameEngineService {
    createInitialState() {
        const startDirX = Math.random() < 0.5 ? -1 : 1;
        const startDirY = Math.random() < 0.5 ? -1 : 1;
        return {
            ballX: game_engine_constants_1.BOARD_WIDTH / 2,
            ballY: game_engine_constants_1.BOARD_HEIGHT / 2,
            p1Y: (game_engine_constants_1.BOARD_HEIGHT - game_engine_constants_1.PADDLE_HEIGHT) / 2,
            p2Y: (game_engine_constants_1.BOARD_HEIGHT - game_engine_constants_1.PADDLE_HEIGHT) / 2,
            score1: 0,
            score2: 0,
            ballVx: game_engine_constants_1.INITIAL_BALL_SPEED_X * startDirX,
            ballVy: game_engine_constants_1.INITIAL_BALL_SPEED_Y * startDirY,
        };
    }
    movePaddle(state, player, direction) {
        const delta = direction === 'up' ? -game_engine_constants_1.PADDLE_SPEED : game_engine_constants_1.PADDLE_SPEED;
        const next = { ...state };
        if (player === 'p1') {
            next.p1Y = this.clampPaddleY(next.p1Y + delta);
        }
        else {
            next.p2Y = this.clampPaddleY(next.p2Y + delta);
        }
        return next;
    }
    updateTick(state) {
        const next = { ...state };
        next.ballX += next.ballVx;
        next.ballY += next.ballVy;
        if (next.ballY - game_engine_constants_1.BALL_RADIUS <= 0 || next.ballY + game_engine_constants_1.BALL_RADIUS >= game_engine_constants_1.BOARD_HEIGHT) {
            next.ballVy *= -1;
            next.ballY = Math.max(game_engine_constants_1.BALL_RADIUS, Math.min(game_engine_constants_1.BOARD_HEIGHT - game_engine_constants_1.BALL_RADIUS, next.ballY));
        }
        const leftPaddleRightX = game_engine_constants_1.PADDLE_MARGIN + game_engine_constants_1.PADDLE_WIDTH;
        const leftContactX = leftPaddleRightX + game_engine_constants_1.BALL_RADIUS;
        const hitLeftPaddle = next.ballVx < 0 &&
            next.ballX <= leftContactX &&
            next.ballX >= game_engine_constants_1.PADDLE_MARGIN &&
            next.ballY >= next.p1Y &&
            next.ballY <= next.p1Y + game_engine_constants_1.PADDLE_HEIGHT;
        if (hitLeftPaddle) {
            next.ballX = leftContactX;
            next.ballVx = Math.abs(next.ballVx);
        }
        const rightPaddleLeftX = game_engine_constants_1.BOARD_WIDTH - game_engine_constants_1.PADDLE_MARGIN - game_engine_constants_1.PADDLE_WIDTH;
        const rightContactX = rightPaddleLeftX - game_engine_constants_1.BALL_RADIUS;
        const hitRightPaddle = next.ballVx > 0 &&
            next.ballX >= rightContactX &&
            next.ballX <= game_engine_constants_1.BOARD_WIDTH - game_engine_constants_1.PADDLE_MARGIN &&
            next.ballY >= next.p2Y &&
            next.ballY <= next.p2Y + game_engine_constants_1.PADDLE_HEIGHT;
        if (hitRightPaddle) {
            next.ballX = rightContactX;
            next.ballVx = -Math.abs(next.ballVx);
        }
        if (next.ballX + game_engine_constants_1.BALL_RADIUS < 0) {
            next.score2 += 1;
            return this.resetBall(next, -1);
        }
        if (next.ballX - game_engine_constants_1.BALL_RADIUS > game_engine_constants_1.BOARD_WIDTH) {
            next.score1 += 1;
            return this.resetBall(next, 1);
        }
        return next;
    }
    getGameResultIfOver(state, p1UserId, p2UserId) {
        if (state.score1 >= game_engine_constants_1.WIN_SCORE) {
            return { winnerId: p1UserId, score1: state.score1, score2: state.score2 };
        }
        if (state.score2 >= game_engine_constants_1.WIN_SCORE) {
            return { winnerId: p2UserId, score1: state.score1, score2: state.score2 };
        }
        return null;
    }
    clampPaddleY(y) {
        return Math.max(0, Math.min(game_engine_constants_1.BOARD_HEIGHT - game_engine_constants_1.PADDLE_HEIGHT, y));
    }
    resetBall(state, toward) {
        const nextDirX = Math.random() < 0.5 ? -1 : 1;
        const nextDirY = Math.random() < 0.5 ? -1 : 1;
        return {
            ...state,
            ballX: game_engine_constants_1.BOARD_WIDTH / 2,
            ballY: game_engine_constants_1.BOARD_HEIGHT / 2,
            ballVx: Math.abs(game_engine_constants_1.INITIAL_BALL_SPEED_X) * nextDirX,
            ballVy: game_engine_constants_1.INITIAL_BALL_SPEED_Y * nextDirY,
        };
    }
};
exports.GameEngineService = GameEngineService;
exports.GameEngineService = GameEngineService = __decorate([
    (0, common_1.Injectable)()
], GameEngineService);
//# sourceMappingURL=game-engine.service.js.map