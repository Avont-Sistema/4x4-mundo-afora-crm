FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

RUN mkdir -p /app/auth

EXPOSE 3001

CMD ["node", "index.js"]
