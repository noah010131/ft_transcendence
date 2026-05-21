# **************************************************************************** #
#                                                                              #
#                                                         :::      ::::::::    #
#    Makefile                                           :+:      :+:    :+:    #
#                                                     +:+ +:+         +:+      #
#    By: chanypar <chanypar@student.42.fr>          +#+  +:+       +#+         #
#                                                 +#+#+#+#+#+   +#+            #
#    Created: 2026/03/15 19:06:56 by daeunki2          #+#    #+#              #
#    Updated: 2026/05/21 10:49:04 by chanypar         ###   ########.fr        #
#                                                                              #
# **************************************************************************** #

NAME = transcendence
COMPOSE = docker compose

DNS ?= f2r7s10

CERT_DIR = gateway/certs
KEY_FILE = $(CERT_DIR)/key.pem
CERT_FILE = $(CERT_DIR)/cert.pem

all: up

cert:
	@if [ ! -f $(KEY_FILE) ] || [ ! -f $(CERT_FILE) ]; then \
		echo "🔒 SSL/TLS 인증서가 없습니다. [DNS: $(DNS)] 기반으로 생성 중..."; \
		mkdir -p $(CERT_DIR); \
		openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
			-keyout $(KEY_FILE) \
			-out $(CERT_FILE) \
			-subj "/C=FR/ST=IDF/L=Paris/O=42/CN=localhost" \
			-addext "subjectAltName = DNS:localhost, DNS:$(DNS), IP:127.0.0.1"; \
		echo "✅ 인증서가 $(CERT_DIR) 내부에 생성되었습니다."; \
	else \
		echo "🔒 인증서가 이미 존재합니다. (건너뜀)"; \
	fi


up-core: cert
	@echo "1. Starting core infra (db/redis)"
	$(COMPOSE) up -d auth-database user-database chat-database game-database redis chat-redis

up-auth-user:
	@echo "2. Starting auth/user services"
	$(COMPOSE) up -d auth-service user-service

up-app:
	@echo "3. Starting app services"
	$(COMPOSE) up --no-deps -d gateway chat-service game-service frontend
	$(COMPOSE) up -d --no-deps uptime-kuma

up: up-core up-auth-user up-app
	@echo "4. All services started 🚀"

up-build: build up

down:
	@echo "Stopping containers 🛑"
	$(COMPOSE) down

build:
	@echo "Building containers 🛠️"
	$(COMPOSE) build

start:
	$(COMPOSE) start

stop:
	$(COMPOSE) stop

restart:
	$(COMPOSE) restart

logs:
	$(COMPOSE) logs -f

ps:
	$(COMPOSE) ps

clean:
	@echo "Removing containers, volumes, and certs 🧹"
	$(COMPOSE) down -v
	rm -rf $(CERT_DIR)

fclean: clean
	@echo "Pruning docker system 🧹"
	docker system prune -af

re: fclean up

.PHONY: all cert up up-core up-auth-user up-app up-build down build start stop restart logs ps clean fclean re
