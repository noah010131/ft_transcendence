import { useNavigate } from 'react-router-dom';
import PageContainer from '../components/ui/PageContainer';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import FooterLinks from '../components/common/FooterLinks';
import Navbar from '../components/common/Navbar';
import { useTheme } from '../theme/useTheme';
import { useI18n } from '../i18n/useI18n';
import { useServiceHealth } from '../contexts/ServiceHealthContext';

export type ErrorVariant = 'notFound' | 'serverError' | 'serviceUnavailable' | 'network';

type ErrorPageProps = {
  variant?: ErrorVariant;
};

const STATUS_DISPLAY: Record<ErrorVariant, string> = {
  notFound: '404',
  serverError: '500',
  serviceUnavailable: '503',
  network: 'OFFLINE',
};

export default function ErrorPage({ variant = 'serviceUnavailable' }: ErrorPageProps) {
  const { theme } = useTheme();
  const { messages } = useI18n();
  const { refresh } = useServiceHealth();
  const navigate = useNavigate();
  const variantMessages = messages.errorPage.variants[variant];

  // 404는 홈으로, 500은 트리가 깨졌으니 풀리로드, 그 외(503/network)는 health 갱신으로 복구 시도
  const handleAction = () => {
    if (variant === 'notFound') {
      navigate('/home');
      return;
    }
    if (variant === 'serverError') {
      window.location.reload();
      return;
    }
    void refresh();
  };

  const actionLabel =
    variant === 'notFound'
      ? messages.errorPage.goHome
      : variant === 'serverError'
      ? messages.errorPage.reload
      : messages.errorPage.retry;

  return (
    <PageContainer header={<Navbar />} footer={<FooterLinks />}>
      <div
        style={{
          width: '100%',
          maxWidth: '600px',
          margin: '0 auto',
        }}
      >
        <Card>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              alignItems: 'center',
              textAlign: 'center',
              padding: '24px 16px',
            }}
          >
            <div
              style={{
                fontSize: '96px',
                fontWeight: 800,
                lineHeight: 1,
                color: theme.colors.danger,
                letterSpacing: '-2px',
              }}
            >
              {STATUS_DISPLAY[variant]}
            </div>
            <div
              style={{
                fontSize: '18px',
                fontWeight: 600,
                color: theme.colors.text,
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              {variantMessages.status}
            </div>
            <h1
              style={{
                margin: 0,
                fontSize: '22px',
                color: theme.colors.text,
              }}
            >
              {variantMessages.title}
            </h1>
            <p
              style={{
                margin: 0,
                color: theme.colors.textMuted,
                fontSize: '14px',
              }}
            >
              {variantMessages.body}
            </p>
            <code
              style={{
                fontSize: '12px',
                color: theme.colors.textMuted,
                background: theme.colors.surfaceAlt ?? 'rgba(0,0,0,0.05)',
                padding: '4px 8px',
                borderRadius: '4px',
              }}
            >
              {messages.errorPage.errorCode}: {variantMessages.errorCode}
            </code>
            <Button onClick={handleAction}>{actionLabel}</Button>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
