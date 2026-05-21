FROM node:20

WORKDIR /app

# 빌드 시점에 CLI 설치를 확실히 해둡니다.
#RUN npm install -g @nestjs/cli

COPY package*.json ./
RUN npm install

COPY . .

# npx를 붙여서 실행하면 node_modules/.bin에서 nest를 강제로 찾아냅니다.
CMD ["npx", "nest", "start", "--watch"]