FROM node:20-bookworm
RUN npx playwright@1.59.1 install --with-deps chromium
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
ENV NODE_ENV=production
EXPOSE 8080
CMD ["npm", "start"]