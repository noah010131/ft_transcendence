/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   PageContainer.tsx                                  :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: daeunki2 <daeunki2@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/03/21 18:39:47 by daeunki2          #+#    #+#             */
/*   Updated: 2026/03/21 18:39:48 by daeunki2         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { useTheme } from '../../theme/useTheme';

type PageContainerProps = {
  header?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

function PageContainer({ header, children, footer }: PageContainerProps) {
  const { theme } = useTheme();

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: theme.colors.background,
        color: theme.colors.text,
        fontFamily: theme.font.family,
      }}
    >
      <header
        style={{
          width: '100%',
          padding: '16px 24px',
          boxSizing: 'border-box',
        }}
      >
        {header}
      </header>

      <main
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '24px',
          boxSizing: 'border-box',
        }}
      >
        {children}
      </main>

      <footer
        style={{
          width: '100%',
          padding: '16px 24px',
          boxSizing: 'border-box',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        {footer}
      </footer>
    </div>
  );
}

export default PageContainer;