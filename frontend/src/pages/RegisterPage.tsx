/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   RegisterPage.tsx                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: daeunki2 <daeunki2@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/03/21 18:46:56 by daeunki2          #+#    #+#             */
/*   Updated: 2026/04/20 16:52:48 by daeunki2         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { useNavigate } from 'react-router-dom';
import PageContainer from '../components/ui/PageContainer';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import TopControls from '../components/ui/TopControls';
import FooterLinks from '../components/common/FooterLinks';
import { useTheme } from '../theme/useTheme';
import { useI18n } from '../i18n/useI18n';
import TextButton from '../components/ui/TextButton';
import { useRegister } from '../hooks/Register';
import { useAuth } from '../contexts/AuthContext';

function RegisterPage() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { messages } = useI18n();
  const { enterGuestMode } = useAuth();

  const handleGuestEnter = async () => {
    const ok = await enterGuestMode();
    if (!ok) {
      setAlertMsg(messages.errors.SERVER_ERROR ?? 'Server error');
      return;
    }
    navigate('/home');
  };

  const {
    id, setId,
    password, setPassword,
    nick, setNick,
    confirmPassword, setConfirmPassword,
    isLoading,
    handleRegister,
    alertMsg,
    setAlertMsg
  } = useRegister();

  
  return (
    <PageContainer
      header={<TopControls />}
      footer={<FooterLinks />}
    >
<Alert 
      open={!!alertMsg} 
      title={messages.register.title}
      message={alertMsg || ''} 
      confirmText={messages.result.false} 
      onClose={() => {
        if (alertMsg === messages.result.success) {
          navigate('/login');
        }
        setAlertMsg(null);
      }} 
    />


      
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          margin: '0 auto',
        }}
      >
        <Card>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              width: '100%',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                textAlign: 'center',
              }}
            >
              <h1
                style={{
                  margin: 0,
                  fontSize: '28px',
                }}
              >
                {messages.register.title}
              </h1>

              <p
                style={{
                  margin: 0,
                  color: theme.colors.textMuted,
                  fontSize: '14px',
                }}
              >
                {messages.register.subtitle}
              </p>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                width: '100%',
              }}
            >
              <Input
                type="id"
                value={id}
                onChange={(event) => setId(event.target.value)}
                placeholder={messages.register.id}
              />
			  <Input
                type="text"
                value={nick}
                onChange={(event) => setNick(event.target.value)}
                placeholder={messages.register.nick}
              />

              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={messages.register.password}
              />

              <Input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder={messages.register.confirmPassword}
              />
            </div>

            <Button onClick={handleRegister} disabled={isLoading}>
              {isLoading ? messages.register.submitting : messages.register.submit}
            </Button>

            <div
              style={{
                textAlign: 'center',
                fontSize: '14px',
                color: theme.colors.textMuted,
              }}
            >
              {messages.register.footerText}{' '}
              <TextButton onClick={() => navigate('/login')}>
                {messages.register.footerLink}
              </TextButton>
            </div>

            <div
              style={{
                textAlign: 'center',
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
        </Card>
      </div>
    </PageContainer>
  );
}

export default RegisterPage;
