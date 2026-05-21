/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   PrivacyPage.tsx                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: daeunki2 <daeunki2@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/15 13:42:48 by daeunki2          #+#    #+#             */
/*   Updated: 2026/04/20 16:43:37 by daeunki2         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import PageContainer from '../components/ui/PageContainer';
import TopControls from '../components/ui/TopControls';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useTheme } from '../theme/useTheme';
import { useI18n } from '../i18n/useI18n';
import { useNavigate } from 'react-router-dom';

const sectionTitleStyle = {
  margin: '0 0 8px 0',
  fontSize: '18px',
};

const paragraphStyle = {
  margin: 0,
  lineHeight: 1.6,
  fontSize: '14px',
};

function PrivacyPage() {
  const { theme } = useTheme();
  const { messages } = useI18n();
  const navigate = useNavigate();

  return (
    <PageContainer header={<TopControls />}>
      <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto' }}>
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <h1 style={{ margin: 0, fontSize: '28px' }}>{messages.privacy.title}</h1>
            <p style={{ ...paragraphStyle, color: theme.colors.textMuted }}>
              {messages.privacy.updatedAt}
            </p>

            <section>
              <h2 style={sectionTitleStyle}>{messages.privacy.section1Title}</h2>
              <p style={paragraphStyle}>
                {messages.privacy.section1Body}
              </p>
            </section>

            <section>
              <h2 style={sectionTitleStyle}>{messages.privacy.section2Title}</h2>
              <p style={paragraphStyle}>
                {messages.privacy.section2Body}
              </p>
            </section>

            <section>
              <h2 style={sectionTitleStyle}>{messages.privacy.section3Title}</h2>
              <p style={paragraphStyle}>
                {messages.privacy.section3Body}
              </p>
            </section>

            <section>
              <h2 style={sectionTitleStyle}>{messages.privacy.section4Title}</h2>
              <p style={paragraphStyle}>
                {messages.privacy.section4Body}
              </p>
            </section>

            <section>
              <h2 style={sectionTitleStyle}>{messages.privacy.section5Title}</h2>
              <p style={paragraphStyle}>
                {messages.privacy.section5Body}
              </p>
            </section>

            <section>
              <h2 style={sectionTitleStyle}>{messages.privacy.section6Title}</h2>
              <p style={paragraphStyle}>
                {messages.privacy.section6Body}
              </p>
            </section>

            <section>
              <h2 style={sectionTitleStyle}>{messages.privacy.section7Title}</h2>
              <p style={paragraphStyle}>
                {messages.privacy.section7Body}
              </p>
            </section>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button onClick={() => navigate(-1)} style={{ minWidth: '96px' }}>
                {messages.privacy.backButton}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}

export default PrivacyPage;
