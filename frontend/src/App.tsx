/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   App.tsx                                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: chanypar <chanypar@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/03/21 18:47:36 by daeunki2          #+#    #+#             */
/*   Updated: 2026/05/18 10:56:50 by chanypar         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import SocialPage from './pages/SocialPage';
import MySpacePage from './pages/MySpacePage';
import GamePage from './pages/GamePage';
import ServiceGuard from './components/common/ServiceGuard';
import ErrorBoundary from './components/common/ErrorBoundary';
import ErrorPage from './pages/ErrorPage';
import { useAuthInit } from './hooks/useAuthInit';
import React, { useCallback, useEffect, useState } from 'react';
import Alert from './components/ui/Alert';
import { useI18n } from './i18n/useI18n';
import { useAuth } from './contexts/AuthContext';
import { usePresenceSocket } from './hooks/usePresenceSocket';
import GameModalHost from './components/ui/GameModalHost';

const AUTH_SESSION_EXPIRED_EVENT = 'auth:session-expired';

function App() {
  const { fetchMe } = useAuthInit();
  const { messages } = useI18n();
  const { user, setUser, isGuest, setIsGuest } = useAuth();
  const currentUserId = user?.userId ?? null;
  const [sessionExpiredOpen, setSessionExpiredOpen] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' && navigator.onLine === false,
  );

  // 브라우저 오프라인 이벤트로 네트워크 단절을 감지해 풀페이지 에러로 교체.
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    // 게스트도 백엔드 쿠키를 갖고 있으므로 fetchMe 가 isGuest 여부를 결정한다.
    // 새로고침 후에도 쿠키가 살아있으면 isGuest 가 복원됨.
    fetchMe().finally(() => setIsAuthReady(true));
  }, []); // 딱 한 번 실행

  useEffect(() => {
    const onSessionExpired = () => {
      setSessionExpiredOpen(true);
    };

    window.addEventListener(
      AUTH_SESSION_EXPIRED_EVENT,
      onSessionExpired as EventListener,
    );
    return () => {
      window.removeEventListener(
        AUTH_SESSION_EXPIRED_EVENT,
        onSessionExpired as EventListener,
      );
    };
  }, []);

  // 추가 이유 : 상태변화를 프론트 어디서나 쓰게 하려고
  usePresenceSocket(currentUserId);

  const handleUnauthenticated = useCallback(() => {
    const isIntentLogout = sessionStorage.getItem('intent_logout') === '1';
    if (isIntentLogout) {
      sessionStorage.removeItem('intent_logout');
      return;
    }
    setSessionExpiredOpen(true);
  }, []);

  return (
    <BrowserRouter>
      {/* suna : Router 내부에서 useNavigate 가 동작해야 하므로 GameModalHost 를 여기에 둔다.
          모달과 매칭 에러 알림이 어느 페이지에서든 일관되게 표시되도록 App 레벨에 마운트. */}
      <GameModalHost />
      <ErrorBoundary>
        {isOffline ? (
          <ErrorPage variant="network" />
        ) : (
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route
              path="/login"
              element={
                <PublicOnlyRoute isAuthenticated={Boolean(user) || isGuest}>
                  <LoginPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicOnlyRoute isAuthenticated={Boolean(user) || isGuest}>
                  <RegisterPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/home"
              element={
                <ProtectedRoute
                  isAuthReady={isAuthReady}
                  isAuthenticated={Boolean(user)}
                  isGuest={isGuest}
                  allowGuest
                  onUnauthenticated={handleUnauthenticated}
                  revalidateAuth={fetchMe}
                >
                  <HomePage />
                </ProtectedRoute>
              }
            />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route
              path="/social" // 가드 추가
              element={
                // 서비스가 죽었으면 인증 체크 전에 ErrorPage를 보여주려고
                // ServiceGuard를 ProtectedRoute 바깥에 둔다. (새로고침 시 user-service 503 →
                // fetchMe 실패 → user null → 세션만료 알람으로 잘못 빠지는 문제 방지)
                <ServiceGuard requires="user">
                  <ProtectedRoute
                    isAuthReady={isAuthReady}
                    isAuthenticated={Boolean(user)}
                    isGuest={isGuest}
                    onUnauthenticated={handleUnauthenticated}
                    revalidateAuth={fetchMe}
                  >
                    <SocialPage />
                  </ProtectedRoute>
                </ServiceGuard>
              }
            />
            <Route
              path="/myspace" // 가드 추가
              element={
                <ServiceGuard requires="user">
                  <ProtectedRoute
                    isAuthReady={isAuthReady}
                    isAuthenticated={Boolean(user)}
                    isGuest={isGuest}
                    onUnauthenticated={handleUnauthenticated}
                    revalidateAuth={fetchMe}
                  >
                    <MySpacePage />
                  </ProtectedRoute>
                </ServiceGuard>
              }
            />
            <Route
              path="/game"
              element={
        //         <ServiceGuard requires="game"> 
        //           <ProtectedRoute
        //             isAuthReady={isAuthReady}
        //             isAuthenticated={Boolean(user)}
        //             isGuest={isGuest}
        //             allowGuest={true}
        //             onUnauthenticated={handleUnauthenticated}
        //             revalidateAuth={fetchMe}
        // >
          <GamePage />
        // </ProtectedRoute>
      // </ServiceGuard>
    }
  />
            <Route path="*" element={<ErrorPage variant="notFound" />} />
          </Routes>
        )}
      </ErrorBoundary>
      <Alert
       //세션 만료 시 경고창으로 재로그인 유도
        open={sessionExpiredOpen}
        title={messages.social.alertTitle}
        message={messages.errors.SESSION_EXPIRED}
        confirmText={messages.result.goLogin}
        onClose={() => {
          setSessionExpiredOpen(false);
          setUser(null);
          setIsGuest(false);
          window.location.href = '/login';
        }}
      />
    </BrowserRouter>
  );
}

function ProtectedRoute({
  isAuthReady,
  isAuthenticated,
  isGuest,
  allowGuest = false,
  onUnauthenticated,
  revalidateAuth,
  children,
}: {
  isAuthReady: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;
  allowGuest?: boolean;
  onUnauthenticated: () => void;
  revalidateAuth: () => Promise<boolean>;
  children: React.ReactElement;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { messages } = useI18n();
  const [isChecking, setIsChecking] = useState(false);
  const [guestBlockedOpen, setGuestBlockedOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!isAuthReady) {
        return;
      }

      // 게스트 처리: allow 라우트면 통과, 아니면 알림 후 /home 으로 보낸다.
      if (isGuest) {
        if (allowGuest) {
          return;
        }
        setGuestBlockedOpen(true);
        return;
      }

      if (!isAuthenticated) {
        onUnauthenticated();
        return;
      }

      // 보호 라우트 진입 시 쿠키-메모리 불일치를 줄이기 위한 1회 재검증
      setIsChecking(true);
      const ok = await revalidateAuth();
      if (!cancelled && !ok) {
        onUnauthenticated();
      }
      if (!cancelled) {
        setIsChecking(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [
    isAuthReady,
    isAuthenticated,
    isGuest,
    allowGuest,
    onUnauthenticated,
    revalidateAuth,
    location.pathname,
  ]);

  if (!isAuthReady || isChecking) {
    return null;
  }

  // 게스트 분기를 isAuthenticated 체크보다 먼저 둔다.
  // 안 그러면 isGuest=true, isAuthenticated=false 조합에서 children 렌더 전에 null 로 떨어진다.
  if (isGuest) {
    if (allowGuest) {
      return children;
    }
    return (
      <Alert
        open={guestBlockedOpen}
        title={messages.guest.blockedTitle}
        message={messages.guest.blockedBody}
        confirmText={messages.result.false}
        onClose={() => {
          setGuestBlockedOpen(false);
          navigate('/home', { replace: true });
        }}
      />
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return children;
}

// 이미 로그인(또는 게스트) 상태에서 /login·/register 직접 진입 시 /home 으로 보낸다.
// 쿠키가 살아있으면 fetchMe 가 비동기로 user 를 채우므로, user 가 set 되는 시점에 리다이렉트한다.
function PublicOnlyRoute({
  isAuthenticated,
  children,
}: {
  isAuthenticated: boolean;
  children: React.ReactElement;
}) {
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/home', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  if (isAuthenticated) {
    return null;
  }
  return children;
}

export default App;
