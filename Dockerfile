FROM node:20-bookworm

WORKDIR /app

COPY package*.json ./
RUN npm install

# Install Playwright Chromium with ALL system dependencies
RUN npx playwright install chromium --with-deps

COPY . .

# Build the Vite frontend
RUN npm run build

ENV NODE_ENV=production

EXPOSE 8080

CMD ["npm", "start"]
