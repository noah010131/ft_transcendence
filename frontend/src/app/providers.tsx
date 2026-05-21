/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   providers.tsx                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: chanypar <chanypar@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/03/21 18:46:12 by daeunki2          #+#    #+#             */
/*   Updated: 2026/05/18 10:55:18 by chanypar         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { ReactNode } from 'react';
import { ThemeProvider } from '../theme/ThemeContext';
import { I18nProvider } from '../i18n/I18nContext';
import { AuthProvider } from '../contexts/AuthContext';
import { GameProvider } from '../contexts/GameContext';
import { ServiceHealthProvider } from '../contexts/ServiceHealthContext';

type ProvidersProps = {
  children: ReactNode;
};

export default function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider>
      <AuthProvider>
		      <GameProvider> 
           <ServiceHealthProvider>
             <I18nProvider>{children}</I18nProvider>
           </ServiceHealthProvider>
		      </GameProvider> 
      </AuthProvider>
    </ThemeProvider>
  );
}