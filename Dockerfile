FROM php:8.1-apache

# Enable apache modules
RUN a2enmod rewrite

# Install common PHP extensions (mysqli, pdo_mysql)
RUN apt-get update && apt-get install -y \
    libonig-dev \
    libzip-dev \
    zip \
    unzip \
    && docker-php-ext-install mysqli pdo pdo_mysql \
    && rm -rf /var/lib/apt/lists/*

# Set working dir
WORKDIR /var/www/html

# Copy any default files if needed (we rely on volumes for html)
# Expose 80 (already in base image)
EXPOSE 80

# Ensure file ownership to www-data (optional)
# this helps with permissions when container writes files
RUN chown -R www-data:www-data /var/www/html
RUN a2enmod dir
