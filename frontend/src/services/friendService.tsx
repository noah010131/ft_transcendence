
import apiClient from './apiClient';

// 친구 목록/요청 응답 항목
export interface FriendItem {
  friendId: number;
  userId: string;
  nickname: string;
  userPhoto: string;
  status?: 'OFFLINE' | 'ONLINE' | 'IN_GAME';
}

// apiClient는 에러 시 { success: false, message } 를 반환한다.
// 기존 호출부와의 호환을 위해 에러 코드를 throw 한다.
const unwrap = (result: any) => {
  if (result.success === false) {
    throw new Error(result.message || 'SERVER_ERROR');
  }
  return result;
};

export const friendService = {
  // 내 친구 목록 조회
  getFriends: async (): Promise<FriendItem[]> => {
    const res = await apiClient('get', 'api/users/friends');
    return unwrap(res).friends;
  },

  // 받은 친구 요청 목록 조회
  getRequests: async (): Promise<FriendItem[]> => {
    const res = await apiClient('get', 'api/users/friends/requests');
    return unwrap(res).requests;
  },

  // 친구 요청 보내기
  sendRequest: async (nickname: string) => {
    const res = await apiClient('post', 'api/users/friends/requests', { nickname });
    return unwrap(res).request;
  },

  // 친구 요청 수락
  acceptRequest: async (friendId: number) => {
    const res = await apiClient('patch', `api/users/friends/requests/${friendId}`, {});
    return unwrap(res).request;
  },

  // 친구 요청 거절
  rejectRequest: async (friendId: number) => {
    const res = await apiClient('delete', `api/users/friends/requests/${friendId}`, {});
    return unwrap(res);
  },

  // 친구 삭제
  removeFriend: async (friendId: number) => {
    const res = await apiClient('delete', `api/users/friends/${friendId}`, {});
    return unwrap(res);
  },
};
