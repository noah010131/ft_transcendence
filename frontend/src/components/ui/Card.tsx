/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   Card.tsx                                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: daeunki2 <daeunki2@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/03/21 18:39:35 by daeunki2          #+#    #+#             */
/*   Updated: 2026/03/21 18:39:36 by daeunki2         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { HTMLAttributes, ReactNode, CSSProperties } from 'react';
import { useTheme } from '../../theme/useTheme';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export default function Card({
  children,
  style,
  ...props
}: CardProps) {
  const { theme } = useTheme();

  const cardStyle: CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    background: theme.colors.surface,
    color: theme.colors.text,
    borderRadius: theme.radius.lg,
    padding: '20px',
    border: `${theme.borderWidth.thin} solid ${theme.colors.border}`,
  };

  return (
    <div
      {...props}
      style={{
        ...cardStyle,
        ...style,
      }}
    >
      {children}
    </div>
  );
}