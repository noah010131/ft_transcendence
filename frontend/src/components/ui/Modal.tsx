import type { ReactNode, CSSProperties } from 'react';
import { useTheme } from '../../theme/useTheme';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  closeOnOverlayClick?: boolean;
};

export default function Modal({
  open,
  onClose,
  children,
  closeOnOverlayClick = true,
}: ModalProps) {
  const { theme } = useTheme();

  if (!open) return null;

  const overlayStyle: CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    background: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  };

  const panelStyle: CSSProperties = {
    background: theme.colors.surface,
    border: `${theme.borderWidth.thin} solid ${theme.colors.border}`,
    borderRadius: theme.radius.lg,
    width: '90%',
    maxWidth: '440px',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  };

  return (
    <div style={overlayStyle} onClick={closeOnOverlayClick ? onClose : undefined}>
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
