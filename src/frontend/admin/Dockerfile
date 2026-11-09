FROM node:26-alpine AS build
WORKDIR /app/admin
COPY admin/package.json admin/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY admin/ ./
COPY shared/ /app/shared/
RUN npx ng build

FROM nginx:1.30-alpine
COPY admin/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/admin/dist/admin /usr/share/nginx/html
EXPOSE 80
