/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   Alert.tsx                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: daeunki2 <daeunki2@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/03/21 18:39:30 by daeunki2          #+#    #+#             */
/*   Updated: 2026/04/05 22:26:02 by daeunki2         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import Card from './Card';
import Button from './Button';
import { useTheme } from '../../theme/useTheme';

type AlertProps = {
  open: boolean;
  title: string;
  message: string;
  confirmText: string;
  onClose: () => void;
};

export default function Alert({
  open,
  title,
  message,
  confirmText,
  onClose,
}: AlertProps) {
  const { theme } = useTheme();

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '360px',
          pointerEvents: 'auto',
        }}
      >
        <Card>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: '20px',
                color: theme.colors.text,
                textAlign: 'center',
              }}
            >
              {title}
            </h2>

            <p
              style={{
                margin: 0,
                fontSize: '14px',
                color: theme.colors.textMuted,
                textAlign: 'center',
                lineHeight: 1.5,
              }}
            >
              {message}
            </p>

            <Button onClick={onClose}>
              {confirmText}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}