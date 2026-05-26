"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const http_proxy_middleware_1 = require("http-proxy-middleware");
const platform_express_1 = require("@nestjs/platform-express");
const jwt_1 = require("@nestjs/jwt");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const platform_socket_io_1 = require("@nestjs/platform-socket.io");
const socket_io_1 = require("socket.io");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const express_1 = __importDefault(require("express"));
const https = __importStar(require("https"));
const http = __importStar(require("http"));
class HttpsIoAdapter extends platform_socket_io_1.IoAdapter {
    httpsServer;
    constructor(httpsServer) {
        super();
        this.httpsServer = httpsServer;
    }
    createIOServer(port, options) {
        return new socket_io_1.Server(this.httpsServer, options);
    }
}
async function bootstrap() {
    const httpsOptions = {
        key: fs.readFileSync(path.join(__dirname, '../certs/key.pem')),
        cert: fs.readFileSync(path.join(__dirname, '../certs/cert.pem')),
    };
    const expressApp = (0, express_1.default)();
    const app = await core_1.NestFactory.create(app_module_1.AppModule, new platform_express_1.ExpressAdapter(expressApp));
    const frontendOriginRaw = process.env.FRONTEND_ORIGIN ?? 'https://localhost:5173';
    const frontendOrigin = frontendOriginRaw
        .split(',')
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0);
    app.enableCors({
        origin: frontendOrigin.length === 1 ? frontendOrigin[0] : frontendOrigin,
        credentials: true,
    });
    app.use((0, cookie_parser_1.default)());
    const jwtService = app.get(jwt_1.JwtService);
    app.use('/api/auth', (0, http_proxy_middleware_1.createProxyMiddleware)({
        target: 'http://auth-service:4000',
        changeOrigin: true,
        pathRewrite: { '^/api/auth': '' },
        cookieDomainRewrite: {
            '*': '',
        },
        on: {
            proxyRes(proxyRes) {
                const cookies = proxyRes.headers['set-cookie'];
                if (!cookies) {
                    return;
                }
                const cookieList = Array.isArray(cookies) ? cookies : [cookies];
                proxyRes.headers['set-cookie'] = cookieList.map((cookie) => {
                    let updated = cookie;
                    if (!/;\s*secure/gi.test(updated)) {
                        updated += '; Secure';
                    }
                    return updated;
                });
            },
        },
    }));
    const verifyAccessToken = createAccessTokenMiddleware(jwtService);
    app.use('/api/users', verifyAccessToken, (0, http_proxy_middleware_1.createProxyMiddleware)({
        target: 'http://user-service:4001',
        changeOrigin: true,
        pathRewrite: { '^/api/users': '' },
        on: {
            error(_err, _req, res) {
                const response = res;
                if (response.headersSent) {
                    return;
                }
                response.status(503).json({
                    success: false,
                    message: 'USER_SERVICE_UNAVAILABLE',
                });
            },
        },
    }));
    const chatProxy = (0, http_proxy_middleware_1.createProxyMiddleware)({
        target: 'http://chat-service:3002',
        changeOrigin: true,
        pathRewrite: { '^/api/chat': '' },
    });
    const gameProxy = (0, http_proxy_middleware_1.createProxyMiddleware)({
        target: 'http://game-service:3003',
        changeOrigin: true,
        pathRewrite: { '^/api/game': '' },
    });
    app.use('/api/chat', verifyAccessToken, chatProxy);
    app.use('/api/game', verifyAccessToken, gameProxy);
    const httpsServer = https.createServer(httpsOptions, expressApp);
    app.useWebSocketAdapter(new HttpsIoAdapter(httpsServer));
    await app.init();
    const handleSocketUpgrade = (request, socket, head) => {
        const url = request.url ?? '';
        if (url.startsWith('/api/chat/socket.io')) {
            if (!authenticateSocketUpgrade(request, socket, jwtService))
                return;
            chatProxy.upgrade(request, socket, head);
            return;
        }
        if (url.startsWith('/api/game/socket.io')) {
            if (!authenticateSocketUpgrade(request, socket, jwtService))
                return;
            gameProxy.upgrade(request, socket, head);
            return;
        }
    };
    httpsServer.on('upgrade', handleSocketUpgrade);
    httpsServer.listen(8000, () => {
        //console.log('Gateway HTTPS running on 8000');
    });
    const internalHttpServer = http.createServer(expressApp);
    internalHttpServer.on('upgrade', handleSocketUpgrade);
    internalHttpServer.listen(8080, () => {
        //console.log('Gateway internal HTTP running on 8080');
    });
}
function authenticateSocketUpgrade(req, socket, jwtService) {
    const token = getCookieValue(req.headers.cookie, 'accessToken');
    if (!token) {
        //console.log('[게이트웨이] 소켓 upgrade 인증 실패 -> ACCESS_TOKEN_REQUIRED');
        socket.destroy();
        return false;
    }
    try {
        const payload = jwtService.verify(token);
        const userId = String(payload.sub ?? '');
        req.headers['x-user-id'] = userId;
        if (payload.id) {
            req.headers['x-user-login-id'] = payload.id;
        }
        if (payload.isGuest === true) {
            req.headers['x-is-guest'] = 'true';
        }
        else {
            delete req.headers['x-is-guest'];
        }
        return true;
    }
    catch {
        //console.log('[게이트웨이] 소켓 upgrade 인증 실패 -> ACCESS_TOKEN_INVALID');
        socket.destroy();
        return false;
    }
}
function getCookieValue(cookieHeader, name) {
    if (!cookieHeader)
        return null;
    const prefix = `${name}=`;
    return cookieHeader
        .split(';')
        .map((value) => value.trim())
        .find((value) => value.startsWith(prefix))
        ?.slice(prefix.length) ?? null;
}
function createAccessTokenMiddleware(jwtService) {
    return (req, res, next) => {
        if (req.method === 'OPTIONS') {
            return next();
        }
        const token = req.cookies?.accessToken;
        const isSocket = req.path.includes('socket.io');
        if (!token) {
            //console.log('[게이트웨이] 액세스 토큰 없음 -> ACCESS_TOKEN_REQUIRED 반환');
            return res.status(401).json({
                success: false,
                message: 'ACCESS_TOKEN_REQUIRED',
            });
        }
        try {
            const payload = jwtService.verify(token);
            const userId = String(payload.sub ?? '');
            req.headers['x-user-id'] = userId;
            if (payload.id) {
                req.headers['x-user-login-id'] = payload.id;
            }
            if (payload.isGuest === true) {
                req.headers['x-is-guest'] = 'true';
            }
            else {
                delete req.headers['x-is-guest'];
            }
            return next();
        }
        catch (error) {
            if (isSocket) {
                //console.log('[게이트웨이] 소켓 인증 실패 -> 연결 강제 종료');
                return req.destroy();
            }
            //console.log('[게이트웨이] 액세스 토큰 검증 실패 -> ACCESS_TOKEN_INVALID');
            return res.status(401).json({
                success: false,
                message: 'ACCESS_TOKEN_INVALID',
            });
        }
    };
}
bootstrap();
//# sourceMappingURL=main.js.map