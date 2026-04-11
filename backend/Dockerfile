FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production && npm install typescript ts-node

COPY tsconfig.json ./
COPY src ./src

EXPOSE 3001

CMD ["npx", "ts-node", "src/server.ts"]
