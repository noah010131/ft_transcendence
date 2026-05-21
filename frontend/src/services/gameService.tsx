/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   gameService.tsx                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: chanypar <chanypar@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/12 11:57:02 by chanypar          #+#    #+#             */
/*   Updated: 2026/05/15 20:58:23 by chanypar         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import apiClient from './apiClient';
import type { GameRecord } from '../types/game';

export const gameService = {
  fetchHistory: async (userId: string): Promise<GameRecord[]> => {
    return await apiClient('get', `api/game/games/history/${userId}`);
  },
};
