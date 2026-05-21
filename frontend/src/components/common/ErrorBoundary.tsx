import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import ErrorPage from '../../pages/ErrorPage';

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

// 렌더 트리에서 던져진 예상 못한 에러를 잡아서 500 페이지로 교체한다.
// 이벤트 핸들러/비동기 에러는 잡지 않으므로 그건 apiClient 쪽에서 처리.
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorPage variant="serverError" />;
    }
    return this.props.children;
  }
}
