"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const user_controller_1 = require("./user.controller");
const user_service_1 = require("./user.service");
const user_entity_1 = require("../entities/user.entity");
const friend_entity_1 = require("../entities/friend.entity");
const friends_module_1 = require("../friends/friends.module");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const health_module_1 = require("../health/health.module");
let UserModule = class UserModule {
};
exports.UserModule = UserModule;
exports.UserModule = UserModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
            }),
            typeorm_1.TypeOrmModule.forRoot({
                type: 'postgres',
                host: 'user-database',
                port: 5432,
                username: process.env.USERDB_USER,
                password: process.env.USERDB_PASSWORD,
                database: 'user-db',
                entities: [user_entity_1.User, friend_entity_1.Friend],
                synchronize: process.env.TYPEORM_SYNCHRONIZE === 'true',
            }),
            typeorm_1.TypeOrmModule.forFeature([user_entity_1.User]),
            jwt_1.JwtModule.register({
                secret: process.env.MY_SECRET_KEY,
                signOptions: { expiresIn: '1h' },
            }),
            friends_module_1.FriendsModule,
            health_module_1.HealthModule,
        ],
        controllers: [user_controller_1.UserController],
        providers: [user_service_1.UserService],
    })
], UserModule);
//# sourceMappingURL=user.module.js.map