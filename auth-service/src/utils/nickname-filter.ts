/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   nickname-filter.ts                                 :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: daeunki2 <daeunki2@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/15 15:25:27 by daeunki2          #+#    #+#             */
/*   Updated: 2026/04/15 15:25:37 by daeunki2         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// 금칙어 목록은 운영하면서 확장/조정할 수 있도록 상수로 분리
const bannedWords = [
  '씨발',
  'fuck',
  'bonjour',
] as const;

// 우회 입력(공백/특수문자 섞기)을 줄이기 위해 비교 전 정규화
export function normalizeNickname(value: string) {
  return value
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9가-힣]/g, '');
}

export function isNicknameAllowed(nickname: string) {
  const normalized = normalizeNickname(nickname);
  if (!normalized) return false;

  return !bannedWords.some((word) => normalized.includes(normalizeNickname(word)));
}
