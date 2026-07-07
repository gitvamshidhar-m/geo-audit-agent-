FROM node:20-bookworm

# Install Playwright dependencies + Chromium
RUN npx playwright@1.59.1 install --with-deps chromium

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy rest of the application
COPY . .

# Build the app
RUN npm run build

# Hugging Face Spaces uses port 7860
ENV PORT=7860
ENV NODE_ENV=production

EXPOSE 7860

CMD ["npm", "start"]
