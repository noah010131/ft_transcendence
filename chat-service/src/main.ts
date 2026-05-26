/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   main.ts                                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: chanypar <chanypar@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/29 19:03:10 by chanypar          #+#    #+#             */
/*   Updated: 2026/05/07 18:42:06 by chanypar         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { NestFactory } from '@nestjs/core';
import { ChatModule } from './chat.module'; // 또는 ChatModule

async function bootstrap() {
  const app = await NestFactory.create(ChatModule);

//   await app.listen(process.env.PORT ?? 3002);
await app.listen(3002, '0.0.0.0');
  console.log(`connect success with port 3002`);
}
bootstrap();