FROM node:26-alpine AS build
WORKDIR /app/abogado
COPY abogado/package.json abogado/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY abogado/ ./
COPY shared/ /app/shared/
RUN npm run build

FROM nginx:1.30-alpine
COPY abogado/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/abogado/dist /usr/share/nginx/html
EXPOSE 80
