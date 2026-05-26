import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Auth } from './entities/auth.entity';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { RefreshSession } from './entities/refresh-session.entity';
import { createHash, randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from './redis/redis.module';
import { isNicknameAllowed } from './utils/nickname-filter'; // 금칙어

const idRegex = /^[A-Za-z0-9]{1,20}$/;       // 1~20자, 영어+숫자 아이디로 <script>alert("해킹")</script> 이런거 넣는거 방지
const passwordRegex = /^[A-Za-z0-9]{4,32}$/;   // 4~32자, 영어+숫자 
const nicknameRegex = /^[A-Za-z0-9]{1,20}$/;

type LoginContext = {
  userAgent?: string;
  ipAddress?: string;
};

type LoginResult =
  | {
      success: true;
      message: string;
      accessToken: string;
      refreshToken: string;
      accessTokenMaxAgeMs: number;
      refreshTokenMaxAgeMs: number;
      // 이유: 프론트는 userId(시스템 UUID = auth row PK)를 매칭/소켓 인증에 쓰고
      // id(로그인 ID 또는 게스트 닉네임)는 화면 표시에 쓴다. 두 필드 모두 필요하다.
      user: { userId: string; id: string; isGuest?: boolean };
    }
  | {
      success: false;
      message: string;
    };

@Injectable()
export class AuthService {
  private readonly defaultAccessTtl = '15m'; //15분
  private readonly defaultRefreshTtl = '7d'; //7일
  private readonly defaultAccessTtlMs = 15 * 60 * 1000;
  private readonly defaultRefreshTtlMs = 7 * 24 * 60 * 60 * 1000;
  // 게스트 refresh TTL — 짧게(30m). 옵션 C(session cookie) 와 함께,
  // 쿠키가 어쩌다 살아남아도 백엔드에서 곧 만료 처리되도록 보호.
  private readonly defaultGuestRefreshTtl = '30m';
  private readonly defaultGuestRefreshTtlMs = 30 * 60 * 1000;

  constructor(
    @InjectRepository(Auth)
    private userRepository: Repository<Auth>,
    @InjectRepository(RefreshSession)
    private refreshSessionRepository: Repository<RefreshSession>,
    private readonly jwtService: JwtService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
  ) {}

  async signUp(userData: any) {
    const { id, password, nick } = userData;

    if (!idRegex.test(id)) {
      return { success: false, message: 'INVALID_ID_FORMAT' };
    }
    if (!passwordRegex.test(password)) {
      return { success: false, message: 'INVALID_PASSWORD_FORMAT' };
    }
    if (!nicknameRegex.test(nick)) {
      return { success: false, message: 'INVALID_NICKNAME_FORMAT' };
    }

    if (typeof nick !== 'string' || nick.trim() === '' || !isNicknameAllowed(nick)) {
    return { success: false, message: 'NICKNAME_NOT_ALLOWED' };
    }

    const existingID = await this.userRepository.findOne({where: { loginId: id }})

    if (existingID)
      return { success: false, message: 'USER_ALREADY_EXISTS' };

    const saltOrRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltOrRounds);

    const newUser = this.userRepository.create({
      loginId: id,
      password: hashedPassword,
    //  refresh_token: null, 테이블을 따로 두어서 이제는 필요 없음
    });
    const savedUser = await this.userRepository.save(newUser); // 인증디비에저장
		console.log(`[signUp가입 성공: ID ${savedUser.id}`);

    try {
      await firstValueFrom(
        this.httpService.post('http://user-service:4001/init', // 유저서비스 쪽에 초기화 요청 보냄. 
        {
          id: savedUser.id,
          loginId: id,
          nickname: nick,
        }),
      );
    } catch (error: any) {
      // user-service init이 실패하면 auth 레코드를 롤백해 데이터 불일치를 방지
      await this.userRepository.delete({ id: savedUser.id });
      const upstreamMessage = error.response?.data?.message;
      console.error(
        '[signUp]User 서비스 초기화 실패:',
        error.response?.data || error.message,
      );
      if (typeof upstreamMessage === 'string' && upstreamMessage.length > 0) {
        return { success: false, message: upstreamMessage };
      }
      return { success: false, message: 'USER_PROFILE_INIT_FAILED' };
    }
	  return { success: true, message: 'SIGNUP_SUCCESS' };
  }

  async login(loginData: any, context?: LoginContext): Promise<LoginResult> {
    const { id, password } = loginData;

    if (!idRegex.test(id)) {
      return { success: false, message: 'INVALID_ID_FORMAT' };
    }
    if (!passwordRegex.test(password)) {
      return { success: false, message: 'INVALID_PASSWORD_FORMAT' };
    }

    const user = await this.userRepository.findOne({ where: { loginId: id } });

    // user.password 가 NULL 인 row 는 게스트 → 일반 로그인 진입 차단.
    if (!user || !user.password || !user.loginId)
      return { success: false, message: 'USER_NOT_FOUND' };

    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) {
      // 동시 로그인 경쟁 조건 방지: 짧은 TTL의 사용자별 로그인 락
      const loginLockKey = `presence:login-lock:${user.id}`;
      const loginLockTtlSec = 15;
      const lockResult = await this.redis.set(loginLockKey, '1', 'EX', loginLockTtlSec, 'NX');
      if (lockResult !== 'OK') {
        return { success: false, message: 'ALREADY_ONLINE' };
      }

      let releaseLoginLock = true;
      try {
      // 상태 기반 제한: 이미 ONLINE 상태면 중복 로그인 차단
      const effectiveState =
        (await this.redis.get(`presence:effective:${user.id}`)) ?? 'OFFLINE';
      if (effectiveState !== 'OFFLINE') {
        return { success: false, message: 'ALREADY_ONLINE' };
      }

      const payload = { sub: user.id, id: user.loginId }; // 토큰안에 들어갈 식별자
      const accessTtl = this.getAccessTokenTtl();
      const refreshTtl = this.getRefreshTokenTtl();
      const accessTokenMaxAgeMs = this.parseTtlToMs(accessTtl, this.defaultAccessTtlMs);
      const refreshTokenMaxAgeMs = this.parseTtlToMs(refreshTtl, this.defaultRefreshTtlMs);

      const accessToken = this.jwtService.sign(payload, { expiresIn: accessTokenMaxAgeMs / 1000 });// 실제 토큰 생성
      console.log('at 토큰 발급 성공');
      const refreshToken = this.jwtService.sign(payload, { expiresIn:refreshTokenMaxAgeMs / 1000 });
      console.log('re 토큰 발급 성공');

      await this.refreshSessionRepository.save({
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        userAgent: context?.userAgent ?? null,
        ipAddress: context?.ipAddress ?? null,
        expiresAt: new Date(Date.now() + refreshTokenMaxAgeMs),
      });
      console.log('re 토큰 저장');

      console.log('[login]로그인 성공');

      // 성공 시에는 락을 즉시 지우지 않고 TTL로만 유지해
      // 소켓 connected 이벤트 반영 전 짧은 레이스 구간을 줄인다.
      releaseLoginLock = false;

      return {
        success: true,
        message: 'LOGIN_SUCCESS',
        accessToken,
        refreshToken,
        accessTokenMaxAgeMs,
        refreshTokenMaxAgeMs,
        user: {
          userId: user.id,
          id: user.loginId,
        },
      };
      } finally {
        if (releaseLoginLock) {
          await this.redis.del(loginLockKey);
        }
      }
    }
    // 실패 시
    return { success: false, message: 'INVALID_PASSWORD' };
  }

  async refresh(refreshToken?: string, context?: LoginContext): Promise<LoginResult> {
    console.log('[인증서비스] refresh 시작');
    if (!refreshToken) {
      console.log('[인증서비스] 리프레시 토큰 없음');
      return { success: false, message: 'REFRESH_TOKEN_REQUIRED' };
    }

    const revoked = await this.isRefreshTokenBlacklisted(refreshToken);
    console.log('[인증서비스] 블랙리스트 조회 완료', { revoked });
    if (revoked) {
      console.log('[인증서비스] 블랙리스트에 등록된 토큰');
      return { success: false, message: 'REFRESH_TOKEN_REVOKED' };
    }

    let oldPayload: { sub: string; id?: string; isGuest?: boolean };
    try {
      oldPayload = this.jwtService.verify<{ sub: string; id?: string; isGuest?: boolean }>(refreshToken);
      console.log('[인증서비스] 리프레시 토큰 서명 검증 성공');
    } catch (error) {
      console.log('[인증서비스] 리프레시 토큰 서명 검증 실패');
      return { success: false, message: 'REFRESH_TOKEN_INVALID' };
    }

    const tokenHash = this.hashToken(refreshToken);
    const session = await this.refreshSessionRepository.findOne({
      where: { tokenHash },
    });

    if (!session) {
      console.log('[인증서비스] 리프레시 세션 없음');
      return { success: false, message: 'REFRESH_SESSION_NOT_FOUND' };
    }

    if (session.expiresAt.getTime() < Date.now()) {
      console.log('[인증서비스] 리프레시 세션 만료');
      await this.refreshSessionRepository.delete({ tokenHash });
      return { success: false, message: 'REFRESH_TOKEN_EXPIRED' };
    }

    const user = await this.userRepository.findOne({
      where: { id: session.userId },
    });
    if (!user) {
      await this.refreshSessionRepository.delete({ tokenHash });
      return { success: false, message: 'USER_NOT_FOUND' };
    }

    // 게스트는 loginId 가 NULL 이므로 화면용 식별자(닉네임)는 직전 토큰 payload 에서 그대로 가져온다.
    // 일반 유저는 loginId 사용. refresh TTL 도 게스트는 짧은 값 유지(30m default).
    const isGuest = user.role === 'guest';
    const accessTtl = this.getAccessTokenTtl();
    const refreshTtl = isGuest ? this.getGuestRefreshTokenTtl() : this.getRefreshTokenTtl();
    const accessTokenMaxAgeMs = this.parseTtlToMs(accessTtl, this.defaultAccessTtlMs);
    const refreshTokenMaxAgeMs = this.parseTtlToMs(
      refreshTtl,
      isGuest ? this.defaultGuestRefreshTtlMs : this.defaultRefreshTtlMs,
    );

    const displayId = isGuest ? oldPayload.id ?? '' : user.loginId ?? '';
    const newPayload = {
      sub: user.id,
      id: displayId,
      ...(isGuest && { isGuest: true }),
    };

    const newAccessToken = this.jwtService.sign(newPayload, {
      expiresIn: accessTokenMaxAgeMs / 1000,
    });
    const newRefreshToken = this.jwtService.sign(newPayload, {
      expiresIn: refreshTokenMaxAgeMs / 1000,
    });
    console.log('[인증서비스] 새 액세스/리프레시 토큰 발급 완료');

    const previousExpiryMs = session.expiresAt.getTime();
    session.tokenHash = this.hashToken(newRefreshToken);
    session.userAgent = context?.userAgent ?? null;
    session.ipAddress = context?.ipAddress ?? null;
    session.expiresAt = new Date(Date.now() + refreshTokenMaxAgeMs);
    await this.refreshSessionRepository.save(session);
    await this.addRefreshTokenToBlacklist(refreshToken, previousExpiryMs - Date.now());
    console.log('[인증서비스] 리프레시 세션 갱신 및 기존 RT 블랙리스트 등록 완료');

    return {
      success: true,
      message: 'REFRESH_SUCCESS',
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      accessTokenMaxAgeMs,
      refreshTokenMaxAgeMs,
      user: {
        userId: user.id,
        id: displayId,
        ...(isGuest && { isGuest: true }),
      },
    };
  }

  async logout(refreshToken?: string) {
    if (!refreshToken) {
      console.log('[logout]refreshToken 없음');
      return {
        success: true,
        message: 'LOGOUT_NO_REFRESH_TOKEN',
      };
    }

    const tokenHash = this.hashToken(refreshToken);

    // 토큰의 주인이 게스트면 cron 을 기다리지 않고 즉시 풀 정리.
    // (logout 으로 refresh_sessions row 만 사라지면 cron 의 expiresAt 검색에 걸리지 않아
    //  auth row 와 user-service 프로필이 영구 누락되는 문제 방지)
    const session = await this.refreshSessionRepository.findOne({ where: { tokenHash } });
    if (session) {
      const owner = await this.userRepository.findOne({ where: { id: session.userId } });
      if (owner?.role === 'guest') {
        await this.deleteGuestFully(owner.id);
        await this.addRefreshTokenToBlacklist(refreshToken);
        console.log('[logout]게스트 풀 정리 완료', { id: owner.id });
        return { success: true, message: 'LOGOUT_SUCCESS' };
      }
    }

    // 일반 유저 — 기존 흐름 그대로
    await this.refreshSessionRepository.delete({ tokenHash });
    await this.addRefreshTokenToBlacklist(refreshToken);

    console.log('[logout]로그아웃 성공');
    return {
      success: true,
      message: 'LOGOUT_SUCCESS',
    };
  }

  // 게스트의 user-service 프로필 + auth row 를 즉시 삭제. CASCADE 로 refresh_sessions 도 함께 정리.
  // user-service 일시 장애 시 refresh_sessions.expiresAt 을 과거로 당겨
  // GuestCleanupService cron(expiresAt < now) 이 다음 주기에 재시도하도록 위임 — self-healing 보장.
  private async deleteGuestFully(authId: string): Promise<void> {
    const userServiceUrl =
      this.configService.get<string>('USER_SERVICE_URL') ?? 'http://user-service:4001';
    const internalSecret = this.configService.get<string>('INTERNAL_SECRET');

    try {
      await firstValueFrom(
        this.httpService.delete(`${userServiceUrl}/internal/users/${authId}`, {
          headers: internalSecret ? { 'x-internal-secret': internalSecret } : {},
        }),
      );
    } catch (error: any) {
      console.warn(
        `[deleteGuestFully] user-service 삭제 실패 (${authId}), cron 재시도 위임:`,
        error.response?.status ?? error.code ?? error.message,
      );
      await this.refreshSessionRepository.update(
        { userId: authId },
        { expiresAt: new Date(0) },
      );
      return;
    }

    // user-service 정리 성공 → auth row 삭제. onDelete CASCADE 로 refresh_sessions 도 같이 사라짐.
    await this.userRepository.delete({ id: authId });
  }

  // 게스트 토큰 발급 (패턴 3 — 게스트도 정식 row + refresh).
  // 매칭/큐가 user_id FK 를 요구하고, 재접속·통계·밴이 stable identity 를 가정하므로
  // 게스트도 일반 유저와 동일한 흐름을 거친다. 차이는 단 두 가지:
  //   1) Auth.loginId/password 가 NULL, role='guest'
  //   2) JWT payload 에 isGuest:true 클레임 추가
  // 닉네임은 Guest_<6hex> 랜덤 — 충돌 시 재시도.
  async guest(context?: LoginContext): Promise<LoginResult> {
    // Auth row 먼저 생성. user-service /init 실패 시 롤백 대상.
    const newAuth = this.userRepository.create({
      loginId: null,
      password: null,
      role: 'guest',
    });
    const savedAuth = await this.userRepository.save(newAuth);
    console.log(`[guest] auth row 생성: ${savedAuth.id}`);

    // user-service 에 프로필 row 생성. 닉네임 충돌(NICKNAME_ALREADY_EXISTS)만 재시도.
    const MAX_NICKNAME_RETRIES = 5;
    let nickname = `Guest_${randomBytes(3).toString('hex')}`;
    let initOk = false;
    for (let attempt = 0; attempt < MAX_NICKNAME_RETRIES; attempt++) {
      try {
        await firstValueFrom(
          this.httpService.post('http://user-service:4001/init', {
            id: savedAuth.id,
            loginId: null,
            nickname,
            role: 'guest',
          }),
        );
        initOk = true;
        break;
      } catch (error: any) {
        const upstreamMessage = error.response?.data?.message;
        if (upstreamMessage === 'NICKNAME_ALREADY_EXISTS') {
          nickname = `Guest_${randomBytes(3).toString('hex')}`;
          continue;
        }
        await this.userRepository.delete({ id: savedAuth.id });
        console.error(
          '[guest] User 서비스 초기화 실패:',
          error.response?.data || error.message,
        );
        return {
          success: false,
          message:
            typeof upstreamMessage === 'string' && upstreamMessage.length > 0
              ? upstreamMessage
              : 'GUEST_INIT_FAILED',
        };
      }
    }
    if (!initOk) {
      await this.userRepository.delete({ id: savedAuth.id });
      return { success: false, message: 'GUEST_NICKNAME_RETRY_EXHAUSTED' };
    }

    // 일반 로그인과 동일한 access/refresh 발급. refresh TTL 만 게스트용 짧은 값 사용.
    const payload = { sub: savedAuth.id, id: nickname, isGuest: true };
    const accessTtl = this.getAccessTokenTtl();
    const refreshTtl = this.getGuestRefreshTokenTtl();
    const accessTokenMaxAgeMs = this.parseTtlToMs(accessTtl, this.defaultAccessTtlMs);
    const refreshTokenMaxAgeMs = this.parseTtlToMs(refreshTtl, this.defaultGuestRefreshTtlMs);

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: accessTokenMaxAgeMs / 1000,
    });
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: refreshTokenMaxAgeMs / 1000,
    });

    await this.refreshSessionRepository.save({
      userId: savedAuth.id,
      tokenHash: this.hashToken(refreshToken),
      userAgent: context?.userAgent ?? null,
      ipAddress: context?.ipAddress ?? null,
      expiresAt: new Date(Date.now() + refreshTokenMaxAgeMs),
    });

    console.log('[guest] 게스트 토큰 발급 완료', {
      userId: savedAuth.id,
      nickname,
    });

    return {
      success: true,
      message: 'GUEST_ISSUED',
      accessToken,
      refreshToken,
      accessTokenMaxAgeMs,
      refreshTokenMaxAgeMs,
      user: { userId: savedAuth.id, id: nickname, isGuest: true },
    };
  }

  private getAccessTokenTtl(): string {
    return this.configService.get<string>('ACCESS_TOKEN_TTL') ?? this.defaultAccessTtl;
  }

  private getRefreshTokenTtl(): string {
    return this.configService.get<string>('REFRESH_TOKEN_TTL') ?? this.defaultRefreshTtl;
  }

  private getGuestRefreshTokenTtl(): string {
    return this.configService.get<string>('GUEST_REFRESH_TTL') ?? this.defaultGuestRefreshTtl;
  }

  private parseTtlToMs(ttl: string, fallback: number): number {
    if (!ttl) return fallback;
    const trimmed = ttl.trim();
    const numericValue = Number(trimmed);
    if (!Number.isNaN(numericValue)) {
      return numericValue;
    }

    const match = trimmed.match(/^(\d+)([smhd])$/i);
    if (!match) {
      return fallback;
    }

    const value = Number(match[1]);
    const unit = match[2].toLowerCase();
    const unitMap: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return value * (unitMap[unit] ?? 1000);
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private getBlacklistKey(hash: string) {
    return `refresh_blacklist:${hash}`;
  }

  private async isRefreshTokenBlacklisted(token: string) {
    const hash = this.hashToken(token);
    const exists = await this.redis.exists(this.getBlacklistKey(hash));
    return exists === 1;
  }

  private async addRefreshTokenToBlacklist(token: string, ttlMs?: number) {
    const hash = this.hashToken(token);
    const key = this.getBlacklistKey(hash);
    const ttl = ttlMs && ttlMs > 0 ? ttlMs : this.defaultRefreshTtlMs;
    await this.redis.set(key, '1', 'PX', ttl);
  }
}
