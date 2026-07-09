FROM mcr.microsoft.com/playwright:v1.42.0-focal
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 8080
CMD ["node", "node_modules/tsx/dist/cli.mjs", "server.ts"]