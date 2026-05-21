/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   userService.tsx                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: chanypar <chanypar@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/10 17:23:09 by chanypar          #+#    #+#             */
/*   Updated: 2026/04/24 18:54:29 by chanypar         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import apiClient from './apiClient';

interface UpdateFields {
  userPhoto?: string;
  nickname?: string;
}

export const userService = {
  // 로그인한 유저 정보 가져오기
  getMe: async () => {
    // 세 번째 인자(data)는 GET이라서 비워두거나 생략
    return await apiClient('get', 'api/users/me', {});
  },

  updateProfile: async (fields: UpdateFields) => {
	return await apiClient('patch', 'api/users/me', fields);
  },

  uploadPhoto: async (formData: FormData) => {
    return await apiClient('post', 'api/users/uploadPhoto', formData);
  }
};