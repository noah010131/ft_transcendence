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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameHistoryService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const game_record_entity_1 = require("./game-record.entity");
let GameHistoryService = class GameHistoryService {
    constructor(gameRecordRepository) {
        this.gameRecordRepository = gameRecordRepository;
    }
    async getHistoryByUserId(userId) {
        const records = await this.gameRecordRepository.find({
            where: [{ player1Id: userId }, { player2Id: userId }],
            order: { playedAt: 'DESC' },
        });
        return records.map((record) => {
            const winnerScore = record.winnerId === record.player1Id ? record.player1Score : record.player2Score;
            const loserScore = record.winnerId === record.player1Id ? record.player2Score : record.player1Score;
            return {
                id: record.id,
                winnerNickname: record.winnerNickname,
                loserNickname: record.loserNickname,
                winnerScore,
                loserScore,
                playedAt: record.playedAt.toISOString(),
            };
        });
    }
};
exports.GameHistoryService = GameHistoryService;
exports.GameHistoryService = GameHistoryService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(game_record_entity_1.GameRecordEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], GameHistoryService);
//# sourceMappingURL=game-history.service.js.map