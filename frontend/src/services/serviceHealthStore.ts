// 외부(React 밖)에서도 읽고 쓰는 마이크로서비스 헬스 상태 저장소.
// apiClient 같은 hook 밖 코드에서도 쓰기 위해 모듈 스코프 변수 + 구독자 패턴 사용.

export type ServiceStatus = 'up' | 'down' | 'unknown';

export type ServiceHealth = {
  auth: ServiceStatus;
  user: ServiceStatus;
};

let state: ServiceHealth = {
  auth: 'unknown',
  user: 'unknown',
};

const listeners = new Set<() => void>();

export const getServiceHealthSnapshot = (): ServiceHealth => state;

export const subscribeServiceHealth = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const emit = () => {
  listeners.forEach((fn) => fn());
};

export const setServiceHealth = (next: Partial<ServiceHealth>) => {
  const merged: ServiceHealth = { ...state, ...next };
  if (merged.auth === state.auth && merged.user === state.user) {
    return;
  }
  state = merged;
  emit();
};

export const markServiceDown = (service: keyof ServiceHealth) => {
  setServiceHealth({ [service]: 'down' } as Partial<ServiceHealth>);
};

export const isUserServiceDown = (): boolean => state.user === 'down';
