FROM php:8.1-apache

# Enable apache modules
RUN a2enmod rewrite
RUN a2enmod dir

# Install system dependencies + PHP extensions
RUN apt-get update && apt-get install -y \
    libonig-dev \
    libzip-dev \
    zip \
    unzip \
    curl \
    && docker-php-ext-install mysqli pdo pdo_mysql \
    && rm -rf /var/lib/apt/lists/*

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working dir
WORKDIR /var/www/html

# Install PHPMailer via Composer
RUN composer require phpmailer/phpmailer --no-interaction --no-progress

# Ensure file ownership to www-data
RUN chown -R www-data:www-data /var/www/html

EXPOSE 80