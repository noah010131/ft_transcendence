/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   TopControls.tsx                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: daeunki2 <daeunki2@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/03/21 18:39:55 by daeunki2          #+#    #+#             */
/*   Updated: 2026/03/21 18:39:56 by daeunki2         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import ToggleSwitch from './ToggleSwitch';
import LanguageSwitcher from './LanguageSwitcher';
import { useTheme } from '../../theme/useTheme';

export default function TopControls() {
  const { themeName, toggleTheme } = useTheme();

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: '12px',
        width: '100%',
        flexWrap: 'wrap',
      }}
    >
      <LanguageSwitcher />
      <ToggleSwitch
        isOn={themeName === 'future'}
        onToggle={toggleTheme}
      />
    </div>
  );
}