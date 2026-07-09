FROM node:20-bookworm

# Install Playwright Chromium with all system dependencies
RUN npx playwright@1.59.1 install --with-deps chromium

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Build the Vite frontend
RUN npm run build

ENV NODE_ENV=production

EXPOSE 8080

CMD ["npm", "start"]
