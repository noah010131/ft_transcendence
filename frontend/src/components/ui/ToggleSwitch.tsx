/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ToggleSwitch.tsx                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: daeunki2 <daeunki2@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/03/21 18:39:51 by daeunki2          #+#    #+#             */
/*   Updated: 2026/03/21 18:39:52 by daeunki2         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { useTheme } from '../../theme/useTheme';

type ToggleSwitchProps = {
  isOn: boolean;
  onToggle: () => void;
};

export default function ToggleSwitch({
  isOn,
  onToggle,
}: ToggleSwitchProps) {
  const { theme, themeName } = useTheme();

  const isRetro = themeName === 'retro';

  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        width: '52px',
        height: '30px',
        padding: 0,
        border: `${theme.borderWidth.thin} solid ${theme.colors.border}`,
        borderRadius: '999px',
        background: isRetro
          ? theme.colors.primary
          : isOn
          ? theme.colors.primary
          : theme.colors.surface,
        position: 'relative',
        cursor: 'pointer',
        boxSizing: 'border-box',
      }}
    >
      <span
        style={{
          width: '22px',
          height: '22px',
          borderRadius: '50%',
          background: isRetro
            ? theme.colors.text
            : theme.colors.primaryText,
          position: 'absolute',
          top: '2px',
          left: isOn ? '26px' : '2px',
        }}
      />
    </button>
  );
}
