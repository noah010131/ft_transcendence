import type { ButtonHTMLAttributes, ReactNode, CSSProperties } from 'react';
import { useTheme } from '../../theme/useTheme';

type TextButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export default function TextButton({
  children,
  style,
  ...props
}: TextButtonProps) {
  const { theme, themeName } = useTheme();

  const isRetro = themeName === 'retro';

  const buttonStyle: CSSProperties = {
    background: 'none',
    border: 'none',
    padding: 0,
    margin: 0,
    cursor: 'pointer',
    fontFamily: theme.font.family,
    fontSize: '14px',
    color: isRetro ? theme.colors.primary : theme.colors.primary,
  };

  return (
    <button
      type="button"
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