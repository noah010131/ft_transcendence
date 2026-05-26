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
exports.ChatRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const typeorm_2 = require("@nestjs/typeorm");
const chat_entity_1 = require("../entities/chat.entity");
let ChatRepository = class ChatRepository {
    constructor(repo) {
        this.repo = repo;
    }
    async saveMessage(data) {
        try {
            const newMessage = this.repo.create(data);
            const savedMessage = await this.repo.save(newMessage);
            //console.log(`[Repository] DB 저장 성공: ID ${savedMessage.id} (From: ${savedMessage.senderId} -> To: ${savedMessage.receiverId})`);
            return savedMessage;
        }
        catch (error) {
            console.error(`[Repository Error] DB 저장 중 에러 발생: ${error.message}`);
            throw error;
        }
    }
    async findUnreadMessages(userId) {
        try {
            const messages = await this.repo.find({
                where: { receiverId: userId },
                order: { createdAt: 'ASC' },
            });
            //console.log(`[Repository] 유저 ${userId}의 미확인 메시지 ${messages.length}건 조회 완료`);
            return messages;
        }
        catch (error) {
            console.error(`[Repository Error] 메시지 조회 실패: ${error.message}`);
            return [];
        }
    }
    async findDmHistory(userA, userB) {
        try {
            const history = await this.repo.find({
                where: [
                    { senderId: userA, receiverId: userB },
                    { senderId: userB, receiverId: userA },
                ],
                order: { createdAt: 'ASC' },
            });
            //console.log(`[Repository] ${userA}-${userB} 대화 내역 ${history.length}건 조회 성공`);
            return history;
        }
        catch (error) {
            console.error(`[Repository Error] findDmHistory 실패: ${error.message}`);
            throw error;
        }
    }
};
exports.ChatRepository = ChatRepository;
exports.ChatRepository = ChatRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_2.InjectRepository)(chat_entity_1.ChatMessage)),
    __metadata("design:paramtypes", [typeorm_1.Repository])
], ChatRepository);
//# sourceMappingURL=chat.repository.js.map