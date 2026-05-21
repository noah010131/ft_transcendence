/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   TermsPage.tsx                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: daeunki2 <daeunki2@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/15 13:44:17 by daeunki2          #+#    #+#             */
/*   Updated: 2026/04/20 16:44:23 by daeunki2         ###   ########.fr       */
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

function TermsPage() {
  const { theme } = useTheme();
  const { messages } = useI18n();
  const navigate = useNavigate();

  return (
    <PageContainer header={<TopControls />}>
      <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto' }}>
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <h1 style={{ margin: 0, fontSize: '28px' }}>{messages.termsPage.title}</h1>
            <p style={{ ...paragraphStyle, color: theme.colors.textMuted }}>
              {messages.termsPage.effectiveDate}
            </p>

            <section>
              <h2 style={sectionTitleStyle}>{messages.termsPage.section1Title}</h2>
              <p style={paragraphStyle}>
                {messages.termsPage.section1Body}
              </p>
            </section>

            <section>
              <h2 style={sectionTitleStyle}>{messages.termsPage.section2Title}</h2>
              <p style={paragraphStyle}>
                {messages.termsPage.section2Body}
              </p>
            </section>

            <section>
              <h2 style={sectionTitleStyle}>{messages.termsPage.section3Title}</h2>
              <p style={paragraphStyle}>
                {messages.termsPage.section3Body}
              </p>
            </section>

            <section>
              <h2 style={sectionTitleStyle}>{messages.termsPage.section4Title}</h2>
              <p style={paragraphStyle}>
                {messages.termsPage.section4Body}
              </p>
            </section>

            <section>
              <h2 style={sectionTitleStyle}>{messages.termsPage.section5Title}</h2>
              <p style={paragraphStyle}>
                {messages.termsPage.section5Body}
              </p>
            </section>

            <section>
              <h2 style={sectionTitleStyle}>{messages.termsPage.section6Title}</h2>
              <p style={paragraphStyle}>
                {messages.termsPage.section6Body}
              </p>
            </section>

            <section>
              <h2 style={sectionTitleStyle}>{messages.termsPage.section7Title}</h2>
              <p style={paragraphStyle}>
                {messages.termsPage.section7Body}
              </p>
            </section>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button onClick={() => navigate(-1)} style={{ minWidth: '96px' }}>
                {messages.termsPage.backButton}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}

export default TermsPage;
