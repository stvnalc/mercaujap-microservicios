FROM node:20-alpine

WORKDIR /app

# Primero solo package*.json para cachear las dependencias
COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 3000
CMD ["node", "index.js"]
