/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   themes.ts                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: daeunki2 <daeunki2@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/03/21 18:47:17 by daeunki2          #+#    #+#             */
/*   Updated: 2026/03/21 20:52:12 by daeunki2         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { Theme } from '../types/theme';

export const retroTheme: Theme = {
  name: 'retro',
  colors: {
    background: '#0b1d51',
    surface: '#142b73',
    primary: '#ffe600',
    primaryText: '#000000',
    text: '#ffffff',
    textMuted: '#bfbfbf',
    border: '#00e5ff',
    accent: '#ff004d',
    accentText: '#ffffff',
    success: '#00ff90',
    danger: '#ff3b3b',
  },
  radius: {
    sm: '0px',
    md: '0px',
    lg: '0px',
  },
  shadow: {
    card: '0 0 0 2px #00e5ff',
    button: 'none',
    focus: 'none',
  },
  font: {
    family: '"Inter", "Noto Sans KR", sans-serif',
    letterSpacing: '0.02em',
    textTransform: 'none',
  },
  borderWidth: {
    thin: '2px',
    thick: '3px',
  },
  motion: {
    fast: '80ms',
    normal: '120ms',
  },
};

export const futureTheme: Theme = {
  name: 'future',
  colors: {
    background: '#020617',
    surface: '#0b1220',
    primary: '#5ad1ff',
    primaryText: '#ffffff',
    text: '#e6f0ff',
    textMuted: '#8aa4c8',
    border: '#1f3b63',
    accent: '#8b5cf6',
    accentText: '#ffffff',
    success: '#2dd4bf',
    danger: '#fb7185',
  },
  radius: {
    sm: '8px',
    md: '14px',
    lg: '20px',
  },
  shadow: {
    card: '0 10px 30px rgba(0, 0, 0, 0.35)',
    button: '0 0 20px rgba(90, 209, 255, 0.25)',
    focus: '0 0 0 2px rgba(90, 209, 255, 0.2), 0 0 0 6px rgba(90, 209, 255, 0.12)',
  },
  font: {
    family: '"Inter", "Noto Sans KR", sans-serif',
    letterSpacing: '0.02em',
    textTransform: 'none',
  },
  borderWidth: {
    thin: '1px',
    thick: '2px',
  },
  motion: {
    fast: '150ms',
    normal: '220ms',
  },
};

export const themes = {
  retro: retroTheme,
  future: futureTheme,
};

export type ThemeName = keyof typeof themes;