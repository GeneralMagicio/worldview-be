FROM node:22-alpine

WORKDIR /usr/src/app
COPY package*.json ./
COPY tsconfig*.json ./
COPY yarn.lock ./
RUN apk update
RUN apk add --no-cache curl openssl
RUN npm install -g @nestjs/cli
RUN npm install -g corepack && corepack enable
RUN yarn install
COPY . .
RUN yarn prisma generate 
RUN yarn run build
EXPOSE 3000
ENTRYPOINT ["sh", "-c", "npx prisma migrate deploy && yarn run start:prod"]