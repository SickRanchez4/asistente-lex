FROM node:26-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:26-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:26-alpine
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=8082 \
    HOSTNAME=0.0.0.0 \
    FILE_STORAGE_PATH=/data/files
COPY --from=build /app/.next/standalone ./
# El volumen de archivos hereda este propietario al crearse por primera vez.
RUN mkdir -p /data/files && chown node:node /data/files
USER node
EXPOSE 8082
CMD ["node", "server.js"]
