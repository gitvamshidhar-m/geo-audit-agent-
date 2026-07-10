FROM node:20-bookworm
WORKDIR /app
COPY package*.json ./
RUN npm install --ignore-scripts
COPY . .
RUN npm run build
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "node_modules/tsx/dist/cli.mjs", "server.ts"]
