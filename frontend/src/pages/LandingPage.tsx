/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   LandingPage.tsx                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: daeunki2 <daeunki2@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/03/21 18:46:45 by daeunki2          #+#    #+#             */
/*   Updated: 2026/03/21 18:46:46 by daeunki2         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../components/ui/PageContainer';
import Button from '../components/ui/Button';
import TextButton from '../components/ui/TextButton';
import TopControls from '../components/ui/TopControls';
import Alert from '../components/ui/Alert';
import FooterLinks from '../components/common/FooterLinks';
import Logo from '../components/common/Logo';
import { useI18n } from '../i18n/useI18n';
import { useTheme } from '../theme/useTheme';
import { useAuth } from '../contexts/AuthContext';

function LandingPage() {
  const { messages } = useI18n();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { enterGuestMode } = useAuth();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGuestEnter = async () => {
    const ok = await enterGuestMode();
    if (!ok) {
      setErrorMsg(messages.errors.SERVER_ERROR ?? 'Server error');
      return;
    }
    navigate('/home');
  };

  return (
    <PageContainer
      header={<TopControls />}
      footer={<FooterLinks />}
    >
      <Alert
        open={!!errorMsg}
        title={messages.landing.title}
        message={errorMsg || ''}
        confirmText={messages.result?.false || 'OK'}
        onClose={() => setErrorMsg(null)}
      />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '32px',
          textAlign: 'center',
        }}
      >
        <Logo width="360px" />

        <h1
          style={{
            margin: 0,
            fontSize: '32px',
          }}
        >
          {messages.landing.title}
        </h1>

        <div
          style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          <Button onClick={() => navigate('/login')}>
            {messages.landing.login}
          </Button>

          <Button onClick={() => navigate('/register')}>
            {messages.landing.register}
          </Button>
        </div>

        <div
          style={{
            fontSize: '14px',
            color: theme.colors.textMuted,
          }}
        >
          {messages.guest.entryText}
          <TextButton onClick={handleGuestEnter}>
            {messages.guest.entryLink}
          </TextButton>
        </div>
      </div>
    </PageContainer>
  );
}

export default LandingPage;