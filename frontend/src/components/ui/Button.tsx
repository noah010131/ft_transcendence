/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   Button.tsx                                         :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: daeunki2 <daeunki2@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/03/21 18:39:20 by daeunki2          #+#    #+#             */
/*   Updated: 2026/03/21 18:39:21 by daeunki2         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */


import type { ButtonHTMLAttributes, ReactNode, CSSProperties } from 'react';
import { useTheme } from '../../theme/useTheme';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export default function Button({
  children,
  style,
  ...props
}: ButtonProps) {
  const { theme, themeName } = useTheme();

  const isRetro = themeName === 'retro';

  const buttonStyle: CSSProperties = {
    fontFamily: theme.font.family,
    fontSize: '14px',
    lineHeight: '1',
    letterSpacing: theme.font.letterSpacing,
    textTransform: theme.font.textTransform,

    borderRadius: theme.radius.md,
    padding: isRetro ? '10px 18px' : '12px 18px',
    minHeight: '44px',

    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',

    background: theme.colors.primary,
    color: theme.colors.primaryText,

    border: isRetro
      ? 'none'
      : `${theme.borderWidth.thin} solid ${theme.colors.border}`,

    boxShadow: 'none',
  };

  return (
    <button
      {...props}
      style={{
        ...buttonStyle,
        ...style,
      }}
    >
      {children}
    </button>
  );
}