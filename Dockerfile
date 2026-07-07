FROM node:20-bookworm

RUN npx playwright@1.59.1 install --with-deps chromium

WORKDIR /app

COPY package*.json ./
RUN npm install --ignore-scripts

COPY . .

ENV PORT=7860
ENV NODE_ENV=production

EXPOSE 7860

CMD ["node", "node_modules/tsx/dist/cli.mjs", "server.ts"]
