import { Injectable, InternalServerErrorException, UnauthorizedException,BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { isNicknameAllowed } from '../utils/nickname-filter';
import { join } from 'path';
import * as fs from 'fs';

const DEFAULT_PHOTO_PATH = '/api/users/uploads/default.jpg';
const UPLOADS_PREFIX_PATH = '/api/users/uploads';

@Injectable()
export class UserService {
  
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

  ) {}


  async createUserProfile(
    id: string,
    // 이유: 기존 email 파라미터 명은 로그인 아이디 전환 후 의미가 달라져 히스토리 보존용으로 주석 처리한다.
    // email: string | null,
    // 이유: auth-service /init payload와 명칭을 맞춰 loginId 기준으로 통일한다.
    loginId: string | null,
    nickname: string,
    role: string = 'normal',
  ) {
    try
    {
      if ( typeof nickname !== 'string' || nickname.trim() === '' || !isNicknameAllowed(nickname) )
      { throw new BadRequestException('NICKNAME_NOT_ALLOWED'); }

      const normalizedNickname = nickname.trim();
      const existingNickname = await this.userRepository.findOne({
        where: { nickname: normalizedNickname },
      });
      if (existingNickname) {
        throw new BadRequestException('NICKNAME_ALREADY_EXISTS');
      }

      const newUser = this.userRepository.create({
      userId: id, // 전달받은 UUID
      loginId,
      nickname: normalizedNickname,
      userPhoto: DEFAULT_PHOTO_PATH,
      role,
      });

      console.log('유저 db생성', { id, role });
      return await this.userRepository.save(newUser);
    }
    catch (error)
    {
      if (error instanceof BadRequestException)
        {throw error;}

      // PG unique violation(23505) — select 체크와 INSERT 사이의 race 에서 발생.
      // auth-service 의 게스트 닉네임 retry 가 같은 메시지로 반응하도록 BadRequest 로 변환.
      const pgCode = error.code ?? error.driverError?.code;
      if (pgCode === '23505') {
        const detail: string = error.driverError?.detail ?? error.detail ?? '';
        if (detail.includes('loginId')) {
          throw new BadRequestException('LOGIN_ID_ALREADY_EXISTS');
        }
        // nickname 충돌이거나 detail 정보가 없는 경우(게스트는 loginId=NULL 이므로 nickname 일 확률이 압도적).
        throw new BadRequestException('NICKNAME_ALREADY_EXISTS');
      }

      console.error('프로필 생성 중 DB 에러:', error.message);
      throw new InternalServerErrorException('유저 프로필 생성 중 서버 에러가 발생했습니다.');
    }
  }

  async getMe(userId: string) {
    const user = await this.userRepository.findOne({ where: { userId } });
    
    if (!user) return null;
    
    if (user.userPhoto && user.userPhoto !== DEFAULT_PHOTO_PATH) {
      const fileName = user.userPhoto.split('/').pop();
      if (fileName) {
      const filePath = join(process.cwd(), 'uploads', fileName);
      
      // 4. 파일이 실제로 없으면 DB 업데이트
      if (!fs.existsSync(filePath)) {
        console.log(`📂 파일 없음: ${fileName}. 기본값으로 복구.`);
        user.userPhoto = DEFAULT_PHOTO_PATH;
        await this.userRepository.save(user);
      }
    }
    }
    console.log('[getme] 성공', user.nickname);
    return user;
  }

  async updateProfile(userId: string, data: { userPhoto?: string; nickname?: string }) {
    // 상태 기반 제한: 매칭/게임 중에는 프로필 수정(닉네임/아바타) 차단
    await this.assertProfileEditable(userId);

    const user = await this.getMe(userId); 
    
    if (!user) {
      throw new UnauthorizedException('유저를 찾을 수 없습니다.');
    }

    // 닉네임 금칙어 확인 
    if (data.nickname !== undefined) {
    if (typeof data.nickname !== 'string' || data.nickname.trim() === '' || !isNicknameAllowed(data.nickname)) {
      throw new BadRequestException('NICKNAME_NOT_ALLOWED');
    }
    const normalizedNickname = data.nickname.trim();
    const existingNickname = await this.userRepository.findOne({
      where: { nickname: normalizedNickname },
    });
    if (existingNickname && existingNickname.userId !== user.userId) {
      throw new BadRequestException('NICKNAME_ALREADY_EXISTS');
    }
    data.nickname = normalizedNickname;
    }

    // 2. DB 업데이트 (TypeORM 문법에 맞게 수정)
    await this.userRepository.update(
      { userId: user.userId }, // 조건
      { 
        // 데이터가 있는 것만 업데이트
        ...(data.userPhoto !== undefined && { userPhoto: data.userPhoto }),
        ...(data.nickname !== undefined && { nickname: data.nickname }),
      }
    );

    // 3. 업데이트된 최신 유저 정보를 다시 가져와서 반환
    console.log('[updateProfile] update 성공', user.userPhoto);
    return await this.userRepository.findOne({ where: { userId: user.userId } });
  }

  // auth-service 의 게스트 cleanup cron 이 호출. 만료된 게스트 row 삭제.
  // 일반 유저(role='normal') 는 이 경로로 들어와도 거부 — 안전망.
  async deleteGuestUser(userId: string) {
    const user = await this.userRepository.findOne({ where: { userId } });
    if (!user) {
      return { success: true, message: 'USER_ALREADY_GONE' };
    }
    if (user.role !== 'guest') {
      throw new BadRequestException('NOT_A_GUEST');
    }
    await this.userRepository.delete({ userId });
    return { success: true, message: 'GUEST_DELETED' };
  }

  async handleFileUpload(userId: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('파일이 존재하지 않습니다.');
    }

    // 1. 파일 접근 URL 생성
    const fileUrl = `${UPLOADS_PREFIX_PATH}/${file.filename}`;

    // 2. DB 업데이트 (기존 updateProfile 로직 재활용 가능)
    const updatedUser = await this.updateProfile(userId, { userPhoto: fileUrl });

    return {
      success: true,
      url: fileUrl,
      user: updatedUser
    };
  }


  // 가드용 공통함수
  private async assertProfileEditable(userId: string): Promise<void> {
    const baseUrl =
      process.env.PRESENCE_INTERNAL_BASE_URL ?? 'http://gateway:8000/internal/presence';
    const timeoutMs = 700;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${baseUrl}/${userId}`, { signal: controller.signal });
      if (!response.ok) {
        throw new InternalServerErrorException('PRESENCE_CHECK_FAILED');
      }

      const presence = (await response.json()) as {
        internalStatus?: 'OFFLINE' | 'ONLINE' | 'MATCHING' | 'IN_GAME';
      };

      if (presence.internalStatus === 'MATCHING' || presence.internalStatus === 'IN_GAME') {
        throw new BadRequestException('PRESENCE_ACTION_BLOCKED');
      }
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
        throw error;
      }
      throw new InternalServerErrorException('PRESENCE_CHECK_FAILED');
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
