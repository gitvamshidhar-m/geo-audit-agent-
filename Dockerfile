FROM node:20-bookworm

# Install dependencies for Playwright/Chromium
RUN npx -y playwright@1.59.1 install --with-deps chromium

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install npm dependencies (including devDependencies needed for build)
RUN npm ci

# Copy the rest of the application
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
