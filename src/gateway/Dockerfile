FROM node:26-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src ./src
USER node
EXPOSE 4000
# Node.js ejecuta TypeScript directamente eliminando las anotaciones de tipo.
CMD ["node", "src/index.ts"]
