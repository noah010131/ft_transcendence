/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   apiClient.tsx                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: chanypar <chanypar@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/04 10:49:09 by chanypar          #+#    #+#             */
/*   Updated: 2026/05/17 22:54:00 by chanypar         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import axios from 'axios';
import {
  isUserServiceDown,
  markServiceDown,
} from './serviceHealthStore';

// suna : env 없으면 현재 접속 호스트의 8000 포트로 fallback.
// localhost로 들어오면 https://localhost:8000, LAN IP로 들어오면 https://<그 IP>:8000.
// 기존 'https://localhost:8000' 하드코딩은 LAN IP 원격 접속에서 깨짐.
const defaultGatewayOrigin =
  typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : '';
const BASE_URL = `${import.meta.env.VITE_API_BASE_URL ?? defaultGatewayOrigin}/`; // gateway 주소
const AUTH_SESSION_EXPIRED_EVENT = 'auth:session-expired';
const USER_SERVICE_PATH_PREFIX = 'api/users';
const USER_SERVICE_UNAVAILABLE_CODE = 'USER_SERVICE_UNAVAILABLE';

// hook 밖에서도 동일 store를 보고 있어서 폴링 결과에 즉시 반응한다.
const targetsUserService = (url: string) => {
  const trimmed = url.startsWith('/') ? url.slice(1) : url;
  return trimmed.startsWith(USER_SERVICE_PATH_PREFIX);
};

// 찬영님이 요청한 '공통 함수'
const apiClient = async (method : 'get' | 'post' | 'put' | 'delete' | 'patch', url : string, data : any = null) => {
  /*
  try {
    const config = {
      method: method,
      url: `${BASE_URL}${url}`,
      data: data,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    const response = await axios(config);
    return { ...response.data };
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.message || "서버 통신 실패"
    };
  }
  */

  const isFormData = data instanceof FormData;

  //재시도를 위해 요청 설정을 함수로 분리
  const createConfig = () => {
    const config: any = {
      method,
      url: `${BASE_URL}${url}`,
      data,
      withCredentials: true,
      headers: {},
    };

    if (!isFormData) {
      config.headers['Content-Type'] = 'application/json';
    }

    return config;
  };

  //  공통 에러 포맷을 message로 통일
  const normalizeError = (error: any) => ({
    success: false,
    message: error?.response?.data?.message || 'SERVER_ERROR',
  });

  // user-service가 down으로 표시돼 있으면 네트워크 호출 자체를 안 하고 즉시 차단한다.
  if (targetsUserService(url) && isUserServiceDown()) {
    return {
      success: false,
      message: USER_SERVICE_UNAVAILABLE_CODE,
    };
  }

  const isSessionExpiredCode = (message: string) =>
    message === 'REFRESH_TOKEN_REQUIRED' ||
    message === 'REFRESH_TOKEN_INVALID' ||
    message === 'REFRESH_TOKEN_EXPIRED' ||
    message === 'REFRESH_SESSION_NOT_FOUND' ||
    message === 'REFRESH_TOKEN_REVOKED';

  try {
    const response = await axios(createConfig());
    return { ...response.data };
  }
  catch (error: any)
  {
    const status = error?.response?.status;
    const code = error?.response?.data?.message;

    // 게이트웨이가 user-service 다운을 503으로 알려주면 store에도 즉시 반영해서
    // 다음 폴링까지 기다리지 않고 동일 화면의 후속 호출을 차단한다.
    if (status === 503 && code === USER_SERVICE_UNAVAILABLE_CODE) {
      markServiceDown('user');
      window.dispatchEvent(new CustomEvent('service-health:recheck'));
      return {
        success: false,
        message: USER_SERVICE_UNAVAILABLE_CODE,
      };
    }

    // Access Token 만료/부재일 때 모두 refresh 시도
    const shouldTryRefresh =
      status === 401 &&
      (code === 'ACCESS_TOKEN_INVALID' || code === 'ACCESS_TOKEN_REQUIRED') &&
      !url.includes('api/auth/refresh');
    if (shouldTryRefresh) {
      try {
        await axios({
          method: 'post',
          url: `${BASE_URL}api/auth/refresh`,
          data: {},
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
          },
        });
        const retryResponse = await axios(createConfig()); // 재발급 성공하면 원요청 시도
        return { ...retryResponse.data };
      } catch (refreshError: any) {
        const normalized = normalizeError(refreshError);

        // refresh도 실패하면(토큰 부재/만료/무효) 전역 세션만료 이벤트를 발행해 경고창으로 유도
        if (isSessionExpiredCode(normalized.message)) {
          window.dispatchEvent(
            new CustomEvent(AUTH_SESSION_EXPIRED_EVENT, {
              detail: { message: normalized.message },
            }),
          );
        }
        return normalized;
      }
    }

    return normalizeError(error);
  }
};

export default apiClient;
