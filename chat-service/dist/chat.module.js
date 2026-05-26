"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const chat_service_1 = require("./chat.service");
const chat_repository_1 = require("./repository/chat.repository");
const chat_gateway_1 = require("./chat.gateway");
const chat_entity_1 = require("./entities/chat.entity");
const config_1 = require("@nestjs/config");
const chat_controller_1 = require("./chat.controller");
const axios_1 = require("@nestjs/axios");
const ioredis_1 = require("ioredis");
const health_module_1 = require("./health/health.module");
let ChatModule = class ChatModule {
};
exports.ChatModule = ChatModule;
exports.ChatModule = ChatModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            axios_1.HttpModule,
            typeorm_1.TypeOrmModule.forRoot({
                type: 'postgres',
                host: 'chat-database',
                port: 5432,
                username: process.env.CHATDB_USER,
                password: process.env.CHATDB_PASSWORD,
                database: 'chat-db',
                entities: [chat_entity_1.ChatMessage],
                synchronize: true,
            }),
            typeorm_1.TypeOrmModule.forFeature([chat_entity_1.ChatMessage]),
            health_module_1.HealthModule,
        ],
        controllers: [chat_controller_1.ChatController],
        providers: [
            chat_gateway_1.ChatGateway,
            chat_service_1.ChatService,
            chat_repository_1.ChatRepository,
            {
                provide: 'REDIS_CLIENT',
                useFactory: () => {
                    return new ioredis_1.default({
                        host: 'redis',
                        port: 6379,
                    });
                },
            },
            {
                provide: 'REDIS_SUB',
                useFactory: () => {
                    return new ioredis_1.default({
                        host: 'redis',
                        port: 6379,
                    });
                },
            },
        ],
    })
], ChatModule);
//# sourceMappingURL=chat.module.js.map