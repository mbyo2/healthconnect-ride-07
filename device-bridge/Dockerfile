FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc || true
COPY devices.json* ./
CMD ["node", "dist/index.js"]
