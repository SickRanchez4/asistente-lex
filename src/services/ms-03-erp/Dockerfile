FROM composer:2.11 AS composer

FROM php:8.5-cli
RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq-dev unzip \
    && docker-php-ext-install pdo_pgsql \
    && rm -rf /var/lib/apt/lists/*
COPY --from=composer /usr/bin/composer /usr/bin/composer

WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --no-interaction --prefer-dist
COPY . .
RUN composer dump-autoload --no-dev --optimize \
    && chown -R www-data:www-data storage bootstrap/cache

ENV APP_ENV=local \
    APP_DEBUG=false \
    LOG_CHANNEL=stderr \
    SESSION_DRIVER=array \
    CACHE_STORE=array \
    QUEUE_CONNECTION=sync \
    PHP_CLI_SERVER_WORKERS=4 \
    RES_OPTIONS="timeout:1 attempts:1"
USER www-data
EXPOSE 8083
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8083"]
