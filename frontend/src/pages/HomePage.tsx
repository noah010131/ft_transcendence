/* ************************************************************************** */
/* */
/* :::      ::::::::   */
/* HomePage.tsx                                       :+:      :+:    :+:   */
/* +:+ +:+         +:+     */
/* By: chanypar <chanypar@student.42.fr>          +#+  +:+       +#+        */
/* +#+#+#+#+#+   +#+           */
/* Created: 2026/03/21 18:46:40 by daeunki2          #+#    #+#             */
/* Updated: 2026/05/15 19:24:31 by chanypar         ###   ########.fr       */
/* */
/* ************************************************************************** */

import PageContainer from '../components/ui/PageContainer';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import FooterLinks from '../components/common/FooterLinks';
import Navbar from '../components/common/Navbar';
import { useTheme } from '../theme/useTheme';
import { useI18n } from '../i18n/useI18n';
import { useAuth } from '../contexts/AuthContext';
import { useGameContext } from '../contexts/GameContext';

// suna : 모달/매칭 상태 + 모달 렌더는 GameProvider + GameModalHost(App 레벨) 로 이관됨.
// HomePage 는 "매칭하기" / "AI 게임" 버튼이 openMatchModal 만 호출하면 된다.
// 기존 자체 모달/ESC/queueError/gameState 네비게이션 로직은 모두 Provider 로 흡수됨.
export default function HomePage() {
  const { messages } = useI18n();
  const { theme } = useTheme();
  const { user } = useAuth();

  const { openMatchModal } = useGameContext();

  const handleStartMatch = (type: 'match' | 'ai') => {
    if (!user?.userId) {
      console.error('[Game] 유저 정보가 없어 매칭을 시작할 수 없습니다.');
      return;
    }
    openMatchModal(type);
  };

  return (
    <PageContainer header={<Navbar />} footer={<FooterLinks />}>
      <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '32px', color: theme.colors.text }}>
            {messages.HomePage.pong}
          </h1>
          <p style={{ marginTop: '8px', color: theme.colors.textMuted, fontSize: '14px' }}>
            {messages.HomePage.summary}
          </p>
        </div>

        <Card style={{ minHeight: '200px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h2 style={{ margin: 0, fontSize: '20px', color: theme.colors.text }}>
              {messages.HomePage.gameRule}
            </h2>
            <p style={{ margin: 0, color: theme.colors.textMuted, fontSize: '18px' }}>
              {messages.HomePage.rule}
            </p>
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
            <Button onClick={() => handleStartMatch('match')} style={{ width: '100%', maxWidth: '320px' }}>
              {messages.HomePage.match}
            </Button>
            <Button onClick={() => handleStartMatch('ai')} style={{ width: '100%', maxWidth: '320px' }}>
              {messages.HomePage.aiGame}
            </Button>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}