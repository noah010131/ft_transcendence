/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   main.ts                                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: chanypar <chanypar@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/15 14:02:33 by daeunki2          #+#    #+#             */
/*   Updated: 2026/05/21 10:28:02 by chanypar         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { ExpressAdapter } from '@nestjs/platform-express';
import { JwtService } from '@nestjs/jwt'; // 토큰검증
import cookieParser from 'cookie-parser'; // 쿠키접근
import type { Request, Response, NextFunction } from 'express';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions, Server } from 'socket.io';
import * as fs from 'fs';
import * as path from 'path';
import express from 'express';
import * as https from 'https';
import * as http from 'http';


class HttpsIoAdapter extends IoAdapter {
  constructor(private readonly httpsServer: https.Server) {
    super();
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    return new Server(this.httpsServer, options);
  }
}

async function bootstrap() {
 // 로컬 mkcert 인증서 파일 읽기
  // .pem 파일들이 backend/gateway/certs/ 폴더에 들어있다고 가정합니다.
  const httpsOptions = {
    key: fs.readFileSync(path.join(__dirname, '../certs/key.pem')),
    cert: fs.readFileSync(path.join(__dirname, '../certs/cert.pem')),
  };

  const expressApp = express();
  
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
  );
  

  // 프론트엔드 오리진도 HTTPS 주소로 강제 연동
  // suna : env에 콤마로 여러 origin을 넣을 수 있게 파싱. 한 개만 있으면 그대로, 여러 개면 배열로 enableCors에 전달.
  // localhost(로컬 개발) + LAN IP(원격 접속) 같은 다중 origin 시나리오 지원.
  const frontendOriginRaw = process.env.FRONTEND_ORIGIN ?? 'https://localhost:5173';
  const frontendOrigin = frontendOriginRaw
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  // 1. CORS 설정 (프론트엔드 허용)
  app.enableCors({
    origin: frontendOrigin.length === 1 ? frontendOrigin[0] : frontendOrigin,
    credentials: true,
  });
  app.use(cookieParser());
  const jwtService = app.get(JwtService);

  // 2. Auth Service로 토스 (주소가 /auth로 시작하면 4000번으로)
  app.use(
    '/api/auth',
    createProxyMiddleware({
      target: 'http://auth-service:4000',
      changeOrigin: true,
      pathRewrite: { '^/api/auth': '' },
      // 이유: 개발 환경에서는 auth-service 컨테이너의 도메인을 그대로 쓰면
      // 브라우저가 쿠키를 저장하지 못하므로 도메인을 비워 요청 호스트에 묶이게 한다.
      // suna : 빈 문자열로 두면 Domain 속성 자체가 제거되어 현재 접속 호스트(localhost / LAN IP)에
      // 자동으로 묶인다. 기존 '*':'localhost'는 LAN IP로 들어오는 원격 접속에서 쿠키가 거절됨.
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
            // 이제 진짜 HTTPS 환경이므로 Secure 플래그를 지우지 않습니다.
            // 브라우저 쿠키 저장과 세션 탈취 방지를 위해 원래 붙어 나온 값을 그대로 유지합니다.
            let updated = cookie;
            // 만약 auth-service에서 Secure 옵션을 안 붙여서 보냈다면, 오히려 여기서 강제로 붙여줍니다.
            if (!/;\s*secure/gi.test(updated)) {
              updated += '; Secure';
            }
            // SameSite=None도 Secure가 보장되므로 굳이 Lax로 바꿀 필요 없이 원본을 인정합니다.
            // 크롬에서 cross-origin 쿠키 전송이 원활하게 작동합니다.
            return updated;
          });
        },
      },
    }),
  );

  // 다른 서비스로 가기 전에 일단 at토큰 검사 
  const verifyAccessToken = createAccessTokenMiddleware(jwtService);

  // 3. User Service로 토스 (주소가 /users로 시작하면 4001번으로)
  app.use(
    '/api/users',
    verifyAccessToken,
    createProxyMiddleware({
      target: 'http://user-service:4001',
      changeOrigin: true,
	    pathRewrite: { '^/api/users': '' },
      
      // user-service 다운 시 502 대신 표준 503 + 코드로 응답 (프론트 헬스 가드와 연결)
      on: {
        error(_err, _req, res) {
          const response = res as Response;
          if (response.headersSent) {
            return;
          }
          response.status(503).json({
            success: false,
            message: 'USER_SERVICE_UNAVAILABLE',
          });
        },
      },
    }),
  );

  // 4. Chat Service로 토스 
  app.use(
    '/api/chat',
    verifyAccessToken,
    createProxyMiddleware({
      target: 'http://chat-service:3002',
      changeOrigin: true,
      ws: true,
      pathRewrite: { '^/api/chat': '' },
    }),
  );

  // 5. game Service로 토스 
  app.use(
    '/api/game',
    verifyAccessToken,
    createProxyMiddleware({
      target: 'http://game-service:3003',
      changeOrigin: true,
      ws: true,
      pathRewrite: { '^/api/game': '' },
    }),
  );

  await app.init();

  const httpsServer = https.createServer(httpsOptions, expressApp);
  app.useWebSocketAdapter(new HttpsIoAdapter(httpsServer));

  httpsServer.listen(8000, () => {
    console.log('Gateway HTTPS running on 8000');
  });

  http.createServer(expressApp).listen(8080, () => {
    console.log('Gateway internal HTTP running on 8080');
  });

  // httpsServer.on('upgrade', (request, socket, head) => {
  // console.log('[게이트웨이] 웹소켓 업그레이드 요청 감지:', request.url);
  // });
}

function createAccessTokenMiddleware(
  jwtService: JwtService,
) // 인증로직
{
  return (req: Request, res: Response, next: NextFunction) =>
  {
    if (req.method === 'OPTIONS')
    {
      return next();
    }
    const token = req.cookies?.accessToken;
    const isSocket = req.path.includes('socket.io'); // 소켓 요청인지 확인

//  console.log('[게이트웨이] 액세스 토큰 검사 시작', { path: req.path,hasAccessToken: Boolean(req.cookies?.accessToken), });

    
    if (!token)
    {
      console.log('[게이트웨이] 액세스 토큰 없음 -> ACCESS_TOKEN_REQUIRED 반환');
      return res.status(401).json({
        success: false,
        message: 'ACCESS_TOKEN_REQUIRED',
      });
    } // 토큰이 완전히 없는 경우 error
    try
    {
      const payload = jwtService.verify(token);
      const userId = String(payload.sub ?? '');
      req.headers['x-user-id'] = userId;

//      console.log('[게이트웨이] 액세스 토큰 검증 성공', { sub: payload.sub });

      if (payload.id) {
        req.headers['x-user-login-id'] = payload.id as string;
      }
      // 이유: game-service 등 하위 서비스에서 게스트/회원 구분 매칭 등에 사용.
      // JWT 클레임 isGuest 가 true 일 때만 'true' 문자열을 박는다.
      if (payload.isGuest === true) {
        req.headers['x-is-guest'] = 'true';
      } else {
        delete req.headers['x-is-guest'];
      }
      return next();
    }
    catch (error)
    {
      if (isSocket) {
        console.log('[게이트웨이] 소켓 인증 실패 -> 연결 강제 종료');
        return req.destroy(); // JSON 응답 없이 스트림을 파괴 (에러 폭발 방지)
      }
      console.log('[게이트웨이] 액세스 토큰 검증 실패 -> ACCESS_TOKEN_INVALID');
      return res.status(401).json({
        success: false,
        message: 'ACCESS_TOKEN_INVALID',
      }); // 만료된 경우. 게이트웨이는 된거만 체크함. 재발급은 인증서비스에서 진행.
    } // 만료된 쿠키도 삭제되기 때문에 현재는 필요 없으나 나중을 위해 남겨둠 
  };
}

bootstrap();

/*
로그인 상태에서 API 요청
게이트웨이 AT 검증
만료/무효면 401
프론트가 /api/auth/refresh 호출
auth-service가 RT 검증 후:
성공: 새 AT/RT 쿠키 발급(회전/블랙리스트 포함), 원요청 재시도
실패: 재로그인 유도
*/
