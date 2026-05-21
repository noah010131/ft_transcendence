/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useTheme.ts                                        :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: daeunki2 <daeunki2@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/03/21 18:47:13 by daeunki2          #+#    #+#             */
/*   Updated: 2026/03/21 18:47:14 by daeunki2         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { useThemeContext } from './ThemeContext';

export function useTheme() {
  return useThemeContext();
}