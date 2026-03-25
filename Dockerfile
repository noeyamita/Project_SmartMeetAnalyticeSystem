FROM php:8.1-apache

# Enable apache modules
RUN a2enmod rewrite dir

# Install system dependencies + PHP extensions
RUN apt-get update && apt-get install -y \
    libonig-dev \
    libzip-dev \
    zip \
    unzip \
    curl \
    cron \
    && docker-php-ext-install mysqli pdo pdo_mysql \
    && rm -rf /var/lib/apt/lists/*

# ตั้ง timezone
RUN ln -sf /usr/share/zoneinfo/Asia/Bangkok /etc/localtime \
    && echo "Asia/Bangkok" > /etc/timezone

# Install composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Install PHPMailer
RUN composer require phpmailer/phpmailer --no-interaction --no-progress

# Cron job (ทุก 1 นาทีตอนทดสอบ)
RUN echo " * * * * * /usr/local/bin/php /var/www/html/src/api/send_reminders.php >> /var/log/reminders.log 2>&1" > /etc/cron.d/send_reminders \
    && chmod 0644 /etc/cron.d/send_reminders \
    && crontab /etc/cron.d/send_reminders

# copy entrypoint
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN sed -i 's/\r//' /docker-entrypoint.sh && chmod +x /docker-entrypoint.sh

# fix permission
RUN chown -R www-data:www-data /var/www/html

EXPOSE 80

CMD ["/docker-entrypoint.sh"]