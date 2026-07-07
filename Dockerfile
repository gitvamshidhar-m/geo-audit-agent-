FROM node:20-bookworm

RUN npx playwright@1.59.1 install --with-deps chromium

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ENV PORT=7860

EXPOSE 7860

CMD ["npm", "run", "dev"]
