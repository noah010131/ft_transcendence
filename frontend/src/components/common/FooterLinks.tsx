/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   FooterLinks.tsx                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: daeunki2 <daeunki2@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/03/21 18:46:26 by daeunki2          #+#    #+#             */
/*   Updated: 2026/03/21 18:46:27 by daeunki2         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../theme/useTheme';
import { useI18n } from '../../i18n/useI18n';
import TextButton from '../ui/TextButton';

function FooterLinks() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { messages } = useI18n();

  return (
    <div
      style={{
        display: 'flex',
        gap: '16px',
        fontSize: '14px',
        color: theme.colors.textMuted,
      }}
    >
		
<TextButton onClick={() => navigate('/privacy')}>
  {messages.footer.privacy}
</TextButton>


<TextButton onClick={() => navigate('/terms')}>
  {messages.footer.terms}
</TextButton>

    </div>
  );
}

export default FooterLinks;