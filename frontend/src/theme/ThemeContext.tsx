/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ThemeContext.tsx                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: daeunki2 <daeunki2@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/03/21 18:47:23 by daeunki2          #+#    #+#             */
/*   Updated: 2026/03/21 18:47:24 by daeunki2         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { themes, type ThemeName } from './themes';
import type { Theme } from '../types/theme';

type ThemeContextValue = {
  theme: Theme;
  themeName: ThemeName;
  setThemeName: (name: ThemeName) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_STORAGE_KEY = 'theme';

type ThemeProviderProps = {
  children: ReactNode;
};

function getInitialThemeName(): ThemeName {
  if (typeof window === 'undefined') {
    return 'future';
  }

  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

  if (savedTheme === 'retro' || savedTheme === 'future') {
    return savedTheme;
  }

  return 'future';
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [themeName, setThemeNameState] = useState<ThemeName>(getInitialThemeName);

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, themeName);

    document.documentElement.setAttribute('data-theme', themeName);
    document.body.style.backgroundColor = themes[themeName].colors.background;
    document.body.style.color = themes[themeName].colors.text;
  }, [themeName]);

  const setThemeName = useCallback((name: ThemeName) => {
    setThemeNameState(name);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeNameState((prev) => (prev === 'retro' ? 'future' : 'retro'));
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    return {
      theme: themes[themeName],
      themeName,
      setThemeName,
      toggleTheme,
    };
  }, [themeName, setThemeName, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }

  return context;
}