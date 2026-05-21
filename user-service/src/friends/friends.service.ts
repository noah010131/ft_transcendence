// src/friends/friends.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Friend } from '../entities/friend.entity';
import { User } from '../entities/user.entity';

// 프론트가 받기 편한 응답 형태
export interface FriendListItem {
  friendId: number; // friends 테이블의 row id (삭제할 때 사용)
  userId: string; // 상대방 user id (uuid)
  nickname: string; // 상대방 닉네임
  userPhoto: string; // 상대방 아바타 URL
  status: 'OFFLINE' | 'ONLINE' | 'IN_GAME'; // 상태 추가
}

@Injectable()
export class FriendsService {
  constructor(
    @InjectRepository(Friend)
    private readonly friendRepo: Repository<Friend>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /**
   * 친구 요청 보내기
   * - nickname으로 상대방을 찾고
   * - 본인/중복/이미 친구 케이스를 거른 뒤 pending row를 만든다
   */
  async sendRequest(requesterId: string, nickname: string): Promise<Friend> {
    // 상태 기반 제한: 매칭/게임 중에는 친구 요청 불가
    await this.assertFriendActionAllowed(requesterId);

    const addressee = await this.userRepo.findOne({ where: { nickname } });
    if (!addressee) {
      throw new NotFoundException('USER_NOT_FOUND');
    }

    if (addressee.userId === requesterId) {
      throw new BadRequestException('CANNOT_ADD_SELF');
    }

    // 양방향 중복 체크: A→B 또는 B→A 어느 쪽이든 있으면 차단
    const existing = await this.friendRepo
      .createQueryBuilder('f')
      .where(
        '(f.requesterId = :a AND f.addresseeId = :b) OR (f.requesterId = :b AND f.addresseeId = :a)',
        { a: requesterId, b: addressee.userId },
      )
      .getOne();
    if (existing) {
      throw new ConflictException('ALREADY_FRIENDS_OR_REQUESTED');
    }

    const friend = this.friendRepo.create({
      requesterId,
      addresseeId: addressee.userId,
      status: 'pending',
    });
    return this.friendRepo.save(friend);
  }

  /**
   * 내 친구 목록 (수락된 친구만)
   * 양방향이므로 requester든 addressee든 본인이 포함된 row는 모두 가져옴
   */
  async getFriends(userId: string): Promise<FriendListItem[]> {
    const rows = await this.friendRepo
      .createQueryBuilder('f')
      .leftJoinAndSelect('f.requester', 'requester')
      .leftJoinAndSelect('f.addressee', 'addressee')
      .where('f.status = :status', { status: 'accepted' })
      .andWhere('(f.requesterId = :uid OR f.addresseeId = :uid)', { uid: userId })
      .getMany();

    const friends = rows.map((row) => {
      const other = row.requesterId === userId ? row.addressee : row.requester;
      return {
        friendId: row.id,
        userId: other.userId,
        nickname: other.nickname,
        userPhoto: other.userPhoto,
        status: 'OFFLINE' as const,
      };
    });

    const statuses = await Promise.all(
      friends.map((friend) => this.getPublicPresenceStatus(friend.userId)),
    );

    return friends.map((friend, index) => ({
      ...friend,
      status: statuses[index],
    }));
  }

  /**
   * 내가 받은 친구 요청 목록 (pending)
   */
  async getReceivedRequests(userId: string): Promise<FriendListItem[]> {
    const rows = await this.friendRepo
      .createQueryBuilder('f')
      .leftJoinAndSelect('f.requester', 'requester')
      .where('f.status = :status', { status: 'pending' })
      .andWhere('f.addresseeId = :uid', { uid: userId })
      .getMany();

    const requests = rows.map((row) => ({
      friendId: row.id,
      userId: row.requester.userId,
      nickname: row.requester.nickname,
      userPhoto: row.requester.userPhoto,
      status: 'OFFLINE' as const,
    }));

    const statuses = await Promise.all(
      requests.map((request) => this.getPublicPresenceStatus(request.userId)),
    );

    return requests.map((request, index) => ({
      ...request,
      status: statuses[index],
    }));
  }

  /**
   * 친구 요청 수락 — 받은 사람만 수락 가능
   */
  async acceptRequest(userId: string, friendId: number): Promise<Friend> {
    // 상태 기반 제한: 매칭/게임 중에는 친구 요청 수락 불가
    await this.assertFriendActionAllowed(userId);

    const row = await this.friendRepo.findOne({ where: { id: friendId } });
    if (!row) throw new NotFoundException('REQUEST_NOT_FOUND');
    if (row.addresseeId !== userId) {
      throw new ForbiddenException('FORBIDDEN');
    }
    if (row.status !== 'pending') {
      throw new BadRequestException('REQUEST_NOT_PENDING');
    }
    row.status = 'accepted';
    const saved = await this.friendRepo.save(row);
    await this.invalidatePresenceFriendCache([row.requesterId, row.addresseeId]);
    return saved;
  }

  /**
   * 친구 요청 거절 — 받은 사람만 거절 가능, row 삭제
   */
  async rejectRequest(userId: string, friendId: number): Promise<void> {
    const row = await this.friendRepo.findOne({ where: { id: friendId } });
    if (!row) throw new NotFoundException('REQUEST_NOT_FOUND');
    if (row.addresseeId !== userId) {
      throw new ForbiddenException('FORBIDDEN');
    }
    if (row.status !== 'pending') {
      throw new BadRequestException('REQUEST_NOT_PENDING');
    }
    await this.friendRepo.delete(row.id);
    await this.invalidatePresenceFriendCache([row.requesterId, row.addresseeId]);
  }

  /**
   * 친구 삭제 — 친구 관계의 양쪽 모두 삭제 가능
   */
  async removeFriend(userId: string, friendId: number): Promise<void> {
    // 상태 기반 제한: 매칭/게임 중에는 친구 삭제 불가
    await this.assertFriendActionAllowed(userId);

    const row = await this.friendRepo.findOne({ where: { id: friendId } });
    if (!row) throw new NotFoundException('FRIEND_NOT_FOUND');
    if (row.requesterId !== userId && row.addresseeId !== userId) {
      throw new ForbiddenException('FORBIDDEN');
    }
    if (row.status !== 'accepted') {
      throw new BadRequestException('NOT_ACCEPTED_FRIENDSHIP');
    }
    await this.friendRepo.delete(row.id);
    await this.invalidatePresenceFriendCache([row.requesterId, row.addresseeId]);
  }

  // 내부용: 수락된 친구의 userId 목록 조회 (presence fan-out 대상 계산)
  async getAcceptedFriendUserIds(userId: string): Promise<string[]> {
    const rows = await this.friendRepo
      .createQueryBuilder('f')
      .select(['f.requesterId', 'f.addresseeId'])
      .where('f.status = :status', { status: 'accepted' })
      .andWhere('(f.requesterId = :uid OR f.addresseeId = :uid)', { uid: userId })
      .getMany();

    return rows.map((row) =>
      row.requesterId === userId ? row.addresseeId : row.requesterId,
    );
  }

  // 친구 관련 변경 액션(요청/수락/삭제) 공통 가드
  private async assertFriendActionAllowed(userId: string): Promise<void> {
    const baseUrl =
      process.env.PRESENCE_INTERNAL_BASE_URL ?? 'http://api-gateway:8000/internal/presence';
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

  private async getPublicPresenceStatus(
    userId: string,
  ): Promise<'OFFLINE' | 'ONLINE' | 'IN_GAME'> {
    const baseUrl =
      process.env.PRESENCE_INTERNAL_BASE_URL ?? 'http://api-gateway:8000/internal/presence';
    const timeoutMs = 700;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${baseUrl}/${userId}`, { signal: controller.signal });
      if (!response.ok) return 'OFFLINE';
      const presence = (await response.json()) as {
        publicStatus?: 'OFFLINE' | 'ONLINE' | 'IN_GAME';
      };
      if (presence.publicStatus === 'IN_GAME') return 'IN_GAME';
      if (presence.publicStatus === 'ONLINE') return 'ONLINE';
      return 'OFFLINE';
    } catch {
      return 'OFFLINE';
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async invalidatePresenceFriendCache(userIds: string[]): Promise<void> {
    const baseUrl =
      process.env.PRESENCE_INTERNAL_BASE_URL ?? 'http://api-gateway:8000/internal/presence';
    const endpoint = `${baseUrl}/friends-cache/invalidate`;

    const normalized = Array.from(
      new Set(userIds.filter((id): id is string => typeof id === 'string' && id.length > 0)),
    );
    if (normalized.length === 0) return;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 700);
    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ userIds: normalized }),
        signal: controller.signal,
      });
    } catch {
      // cache invalidation 실패는 핵심 액션을 깨지 않도록 무시
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
