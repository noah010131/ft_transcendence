import { useCallback, useContext, useEffect, useRef, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';
import {
  getServiceHealthSnapshot,
  setServiceHealth,
  subscribeServiceHealth,
  type ServiceStatus,
} from '../services/serviceHealthStore';
import { ServiceHealthContext } from './ServiceHealthContext.types';
import type { ServiceHealthContextValue } from './ServiceHealthContext.types';

// suna : env 없으면 현재 접속 호스트의 8000 포트로 fallback (LAN IP 원격 접속 대응).
const defaultGatewayOrigin =
  typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : '';
const HEALTH_URL = `${import.meta.env.VITE_API_BASE_URL ?? defaultGatewayOrigin}/health/ready`;
const POLL_INTERVAL_MS = 15_000;

// terminus 응답에서 서비스별 상태를 뽑아온다. 200/503 둘 다 details 포맷은 같다.
const parseServiceStatus = (
  payload: unknown,
  serviceName: string,
): ServiceStatus => {
  if (!payload || typeof payload !== 'object') {
    return 'unknown';
  }
  const details = (payload as { details?: Record<string, { status?: string }> }).details;
  const entry = details?.[serviceName];
  if (!entry) {
    return 'unknown';
  }
  if (entry.status === 'up') return 'up';
  if (entry.status === 'down') return 'down';
  return 'unknown';
};

export const useServiceHealth = (): ServiceHealthContextValue => {
  const context = useContext(ServiceHealthContext);
  if (context === undefined) {
    throw new Error('useServiceHealth는 ServiceHealthProvider 내부에서만 사용할 수 있습니다.');
  }
  return context;
};

export const ServiceHealthProvider = ({ children }: { children: ReactNode }) => {
  const health = useSyncExternalStore(subscribeServiceHealth, getServiceHealthSnapshot);
  const inFlightRef = useRef<Promise<void> | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    if (inFlightRef.current) {
      return inFlightRef.current;
    }
    const run = (async () => {
      try {
        const response = await axios.get(HEALTH_URL, {
          // 200/503 모두 응답 본문(details)에서 서비스별 상태를 읽으려고 throw 막음
          validateStatus: () => true,
          withCredentials: true,
        });
        const data = response.data;
        setServiceHealth({
          auth: parseServiceStatus(data, 'auth-service'),
          user: parseServiceStatus(data, 'user-service'),
        });
      } catch {
        // 네트워크 자체가 죽었으면 게이트웨이 다운 → 둘 다 down 으로 본다
        setServiceHealth({ auth: 'down', user: 'down' });
      } finally {
        inFlightRef.current = null;
      }
    })();
    inFlightRef.current = run;
    return run;
  }, []);

  // 마운트 시 즉시 1회 + 주기 폴링. 탭이 백그라운드면 setInterval만 동작.
  useEffect(() => {
    refresh();
    const id = window.setInterval(refresh, POLL_INTERVAL_MS);
    return () => {
      window.clearInterval(id);
    };
  }, [refresh]);

  // apiClient가 503을 받으면 store를 down으로 마킹하는데, 다음 폴링까지 기다리지 않게
  // 즉시 한번 더 health 호출을 시켜서 복구 시점도 빨리 잡아낸다.
  useEffect(() => {
    const onForceCheck = () => {
      refresh();
    };
    window.addEventListener('service-health:recheck', onForceCheck);
    return () => {
      window.removeEventListener('service-health:recheck', onForceCheck);
    };
  }, [refresh]);

  const value: ServiceHealthContextValue = { health, refresh };

  return (
    <ServiceHealthContext.Provider value={value}>
      {children}
    </ServiceHealthContext.Provider>
  );
};
