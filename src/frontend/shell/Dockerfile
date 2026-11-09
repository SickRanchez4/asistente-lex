FROM node:26-alpine AS build
ARG ABOGADO_URL=http://localhost:9100/asistente-lex-abogado.js
ARG ADMIN_URL=http://localhost:9200/main.js
ENV ABOGADO_URL=$ABOGADO_URL \
    ADMIN_URL=$ADMIN_URL
WORKDIR /app/shell
COPY shell/package.json shell/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY shell/ ./
COPY shared/ /app/shared/
RUN npm run build

FROM nginx:1.30-alpine
COPY shell/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/shell/dist /usr/share/nginx/html
EXPOSE 80
