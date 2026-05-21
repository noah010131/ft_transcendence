/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   message.dto.ts                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: chanypar <chanypar@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/29 19:03:22 by chanypar          #+#    #+#             */
/*   Updated: 2026/04/29 19:03:24 by chanypar         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class SendDmDto {
  @IsString()
  @IsNotEmpty()
  to: string; // 수신자 ID

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000) // 메시지 길이 제한
  message: string;
}

export class GetHistoryDto {
  @IsString()
  @IsNotEmpty()
  targetId: string; // 대화 상대방 ID
}