/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   theme.ts                                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: daeunki2 <daeunki2@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/03/21 18:47:31 by daeunki2          #+#    #+#             */
/*   Updated: 2026/03/21 18:47:32 by daeunki2         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

export type ThemeName = 'retro' | 'future';

export type Theme = {
  name: ThemeName;
  colors: {
    background: string;
    surface: string;
    primary: string;
    primaryText: string;
    text: string;
    textMuted: string;
    border: string;
    accent: string;
    accentText: string;
    success: string;
    danger: string;
  };
  radius: {
    sm: string;
    md: string;
    lg: string;
  };
  shadow: {
    card: string;
    button: string;
    focus: string;
  };
  font: {
    family: string;
    letterSpacing: string;
    textTransform: 'none' | 'uppercase';
  };
  borderWidth: {
    thin: string;
    thick: string;
  };
  motion: {
    fast: string;
    normal: string;
  };
};