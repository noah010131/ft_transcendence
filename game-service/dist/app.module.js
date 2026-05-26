"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const health_module_1 = require("./health/health.module");
const game_gateway_1 = require("./game.gateway");
const redis_module_1 = require("./redis/redis.module");
const matchmaking_module_1 = require("./matchmaking/matchmaking.module");
const game_engine_service_1 = require("./engine/game-engine.service");
const game_record_entity_1 = require("./game-record.entity");
const game_history_service_1 = require("./game-history.service");
const game_history_controller_1 = require("./game-history.controller");
const game_runtime_service_1 = require("./engine/game-runtime.service");
const ai_bot_service_1 = require("./engine/ai-bot.service");
const ai_runtime_adapter_1 = require("./engine/ai-runtime.adapter");
const game_ai_gateway_helper_1 = require("./game-ai.gateway.helper");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            typeorm_1.TypeOrmModule.forRoot({
                type: 'postgres',
                host: 'game-database',
                port: 5432,
                username: process.env.GAMEDB_USER,
                password: process.env.GAMEDB_PASSWORD,
                database: 'game-db',
                entities: [game_record_entity_1.GameRecordEntity],
                synchronize: true,
            }),
            typeorm_1.TypeOrmModule.forFeature([game_record_entity_1.GameRecordEntity]),
            health_module_1.HealthModule,
            redis_module_1.RedisModule,
            matchmaking_module_1.MatchmakingModule,
        ],
        controllers: [game_history_controller_1.GameHistoryController],
        providers: [
            game_gateway_1.GameGateway,
            game_engine_service_1.GameEngineService,
            game_history_service_1.GameHistoryService,
            game_runtime_service_1.GameRuntimeService,
            ai_bot_service_1.AiBotService,
            ai_runtime_adapter_1.AiRuntimeAdapter,
            game_ai_gateway_helper_1.GameAiGatewayHelper,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map