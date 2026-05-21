/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   Input.tsx                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: daeunki2 <daeunki2@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/03/21 18:39:39 by daeunki2          #+#    #+#             */
/*   Updated: 2026/03/21 18:39:40 by daeunki2         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { CSSProperties, InputHTMLAttributes } from 'react';
import { useTheme } from '../../theme/useTheme';

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export default function Input({
  style,
  ...props
}: InputProps) {
  const { theme, themeName } = useTheme();

  const isRetro = themeName === 'retro';

  const inputStyle: CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    background: isRetro ? theme.colors.background : theme.colors.surface,
    color: theme.colors.text,
    fontFamily: theme.font.family,
    fontSize: '14px',
    lineHeight: '1.2',
    letterSpacing: theme.font.letterSpacing,
    textTransform: theme.font.textTransform,
    borderRadius: theme.radius.md,
    padding: isRetro ? '10px 12px' : '12px 14px',
    minHeight: '44px',
    border: `${theme.borderWidth.thin} solid ${theme.colors.border}`,
    outline: 'none',
    boxShadow: 'none',
  };

  return (
    <input
      {...props}
      style={{
        ...inputStyle,
        ...style,
      }}
    />
  );
}