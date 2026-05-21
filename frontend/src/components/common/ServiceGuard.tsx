import type { ReactElement } from 'react';
import { useServiceHealth } from '../../contexts/ServiceHealthContext';
import ErrorPage from '../../pages/ErrorPage';

type ServiceGuardProps = {
  requires: 'user' | 'auth';
  children: ReactElement;
};

// 헬스 컨텍스트에서 해당 서비스가 down이면 503 페이지로 교체.
// unknown(폴링 첫 응답 도착 전)은 일단 통과시켜서 첫 화면 깜빡임을 막는다.
export default function ServiceGuard({ requires, children }: ServiceGuardProps) {
  const { health } = useServiceHealth();
  if (health[requires] === 'down') {
    return <ErrorPage variant="serviceUnavailable" />;
  }
  return children;
}
