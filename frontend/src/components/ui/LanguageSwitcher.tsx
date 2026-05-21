/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   LanguageSwitcher.tsx                               :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: daeunki2 <daeunki2@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/03/21 18:39:43 by daeunki2          #+#    #+#             */
/*   Updated: 2026/03/21 18:39:44 by daeunki2         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { useTheme } from '../../theme/useTheme';
import { useI18n } from '../../i18n/useI18n';
import type { Locale } from '../../types/i18n';

const LOCALES: Locale[] = ['en', 'ko', 'fr'];

export default function LanguageSwitcher() {
  const { theme, themeName } = useTheme();
  const { locale, setLocale } = useI18n();

  const isRetro = themeName === 'retro';

  return (
    <div
      style={{
        display: 'flex',
        border: `${theme.borderWidth.thin} solid ${theme.colors.border}`,
        borderRadius: isRetro ? '0px' : '999px',
        overflow: 'hidden',
        background: theme.colors.surface,
      }}
    >
      {LOCALES.map((item) => {
        const isActive = locale === item;

        return (
          <button
            key={item}
            type="button"
            onClick={() => setLocale(item)}
            style={{
              padding: '8px 14px',
              border: 'none',
              background: isActive ? theme.colors.primary : 'transparent',
              color: isActive ? theme.colors.primaryText : theme.colors.text,
              cursor: 'pointer',
              fontFamily: theme.font.family,
              fontSize: '14px',
            }}
          >
            {item.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}