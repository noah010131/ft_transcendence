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
exports.PresenceModule = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const presence_controller_1 = require("./presence.controller");
const presence_redis_1 = require("./presence.redis");
const presence_service_1 = require("./presence.service");
const presence_socket_gateway_1 = require("./presence.socket.gateway");
let PresenceModule = class PresenceModule {
    presenceService;
    constructor(presenceService) {
        this.presenceService = presenceService;
    }
    async onModuleInit() {
        await this.presenceService.startRawEventConsumer();
        this.presenceService.startHeartbeatReconciler();
    }
};
exports.PresenceModule = PresenceModule;
exports.PresenceModule = PresenceModule = __decorate([
    (0, common_1.Module)({
        imports: [
            jwt_1.JwtModule.register({
                secret: process.env.MY_SECRET_KEY,
            }),
        ],
        controllers: [presence_controller_1.PresenceController],
        providers: [presence_redis_1.PresenceRedis, presence_service_1.PresenceService, presence_socket_gateway_1.PresenceSocketGateway],
        exports: [presence_service_1.PresenceService],
    }),
    __metadata("design:paramtypes", [presence_service_1.PresenceService])
], PresenceModule);
//# sourceMappingURL=presence.module.js.map