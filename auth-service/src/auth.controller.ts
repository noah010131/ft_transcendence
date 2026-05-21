import { Controller, Post, Get, Body, Res, Req, HttpException, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import * as express from 'express';
import type { CookieOptions, Response } from 'express';

@Controller()
export class AuthController {
  private readonly isProduction = process.env.NODE_ENV === 'production';

  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  // 인증 검증 전용 엔드포인트.
  // user-service 의 /me 와 분리해서, 프로필이 죽어도 인증 자체는 살아있을 수 있게 한다.
  // (graceful degradation: hard dependency → soft dependency)
  @Get('me')
  me(@Req() request: express.Request) {
    const token = request.cookies?.accessToken;
    if (!token) {
      throw new HttpException(
        { success: false, message: 'ACCESS_TOKEN_REQUIRED' },
        HttpStatus.UNAUTHORIZED,
      );
    }
    try {
      const payload = this.jwtService.verify(token);
      return {
        success: true,
        user: {
          userId: String(payload.sub ?? ''),
          id: payload.id ?? '',
          isGuest: payload.isGuest === true,
        },
      };
    } catch {
      throw new HttpException(
        { success: false, message: 'ACCESS_TOKEN_INVALID' },
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  @Post('login')
  async login(
    @Body() loginData: any,
    @Req() request: express.Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    console.log('[login]프론트에서 온 데이터:', loginData);
    const result = await this.authService.login(loginData, {
      userAgent: request.headers['user-agent'],
      ipAddress: request.ip,
    });

    if (result.success) {
      const baseCookieOptions = this.getBaseCookieOptions();
      response.cookie('accessToken', result.accessToken, {
        ...baseCookieOptions,
        maxAge: result.accessTokenMaxAgeMs,
      });
      response.cookie('refreshToken', result.refreshToken, {
        ...baseCookieOptions,
        maxAge: result.refreshTokenMaxAgeMs,
      });
      console.log('[인증컨트롤러] 새 쿠키(access/refresh) 설정 완료');
    }

    return result;
  }
	@Post('signup')
		async signUp(@Body() userData: any) {
    	console.log('[signup]프론트에서 온 데이터:', userData);
		return await this.authService.signUp(userData);
	}

  @Post('refresh')
  async refresh(
    @Req() request: express.Request,
    @Res({ passthrough: true }) response: Response,
  ){
    console.log('[인증컨트롤러] 리프레시 요청 수신', { hasRefreshToken: Boolean(request.cookies?.refreshToken),});

    const refreshToken = request.cookies?.refreshToken;
    const result = await this.authService.refresh(refreshToken, {
      userAgent: request.headers['user-agent'],
      ipAddress: request.ip,
    });

    console.log('[인증컨트롤러] 리프레시 처리 결과', { success: result.success, message: result.message,});


    if (result.success) {
      const baseCookieOptions = this.getBaseCookieOptions();
      // 게스트는 session cookie 유지(maxAge 생략). 일반 유저는 persistent.
      const isGuest = result.user.isGuest === true;
      response.cookie('accessToken', result.accessToken, {
        ...baseCookieOptions,
        ...(!isGuest && { maxAge: result.accessTokenMaxAgeMs }),
      });
      response.cookie('refreshToken', result.refreshToken, {
        ...baseCookieOptions,
        ...(!isGuest && { maxAge: result.refreshTokenMaxAgeMs }),
      });
    }

    return result;
  }

  // 게스트 토큰 발급. 옵션 C — session cookie + 짧은 refresh TTL.
  // 쿠키에 maxAge 를 주지 않으면 브라우저가 탭/창 종료 시 쿠키를 폐기(session cookie).
  // 백엔드 refresh TTL 도 짧게(30m default) → 쿠키가 어쩌다 살아남아도 곧 만료.
  // DB row 정리는 GuestCleanupService 가 만료된 refresh_sessions 기준으로 cron 처리.
  @Post('guest')
  async guest(
    @Req() request: express.Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.guest({
      userAgent: request.headers['user-agent'],
      ipAddress: request.ip,
    });

    if (result.success) {
      const baseCookieOptions = this.getBaseCookieOptions();
      // 의도적으로 maxAge 생략 → session cookie. 탭 닫으면 사라짐.
      response.cookie('accessToken', result.accessToken, baseCookieOptions);
      response.cookie('refreshToken', result.refreshToken, baseCookieOptions);
      console.log('[게스트컨트롤러] 게스트 session cookie 설정 완료');
    }

    return result;
  }

	@Post('logout')
  		async logout(
      @Req() request: express.Request,
      @Res({ passthrough: true }) response: Response,
    ) {
    // 1. 서비스 로직 실행 (필요한 경우 DB 상태 변경 등)
    	const refreshToken = request.cookies?.refreshToken;
    	const result = await this.authService.logout(refreshToken);

    // 2. 쿠키 삭제 (만료 시간을 아주 과거인 0으로 설정)
    const baseCookieOptions = this.getBaseCookieOptions();
    const expiredAt = new Date(0);
    response.cookie('accessToken', '', {
      ...baseCookieOptions,
      expires: expiredAt,
    });
    response.cookie('refreshToken', '', {
      ...baseCookieOptions,
      expires: expiredAt,
    });

    	return (result);
  	}

  private getBaseCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: 'lax',
      path: '/',
    };
  }
}
