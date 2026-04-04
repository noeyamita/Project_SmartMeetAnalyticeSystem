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

# ✅ COPY ไฟล์โปรเจกต์ทั้งหมดเข้า container
COPY . /var/www/html/

# ✅ ตั้ง DocumentRoot ชี้ไปที่ /var/www/html/html และเปิด login.html เป็นหน้าแรก
RUN sed -i 's|DocumentRoot /var/www/html|DocumentRoot /var/www/html/html|g' \
    /etc/apache2/sites-available/000-default.conf \
    && echo '<Directory /var/www/html/html>\n\
    DirectoryIndex login.html index.php index.html\n\
    Options Indexes FollowSymLinks\n\
    AllowOverride All\n\
    Require all granted\n\
    </Directory>' >> /etc/apache2/apache2.conf

# Install PHPMailer
RUN composer require phpmailer/phpmailer --no-interaction --no-progress

# Cron job
RUN echo "* * * * * root /usr/local/bin/php /var/www/html/src/api/send_reminders.php >> /var/log/reminders.log 2>&1\n\
    0 0 1 * * root /usr/local/bin/php /var/www/html/src/api/resetMonthly.php >> /var/log/reset.log 2>&1\n\
    */30 * * * * root /usr/local/bin/php /var/www/html/src/api/returnEquipment.php >> /var/log/returnEquipment.log 2>&1" > /etc/cron.d/send_reminders \
    && chmod 0644 /etc/cron.d/send_reminders \
    && crontab /etc/cron.d/send_reminders \
    && touch /var/log/reminders.log /var/log/reset.log /var/log/returnEquipment.log \
    && chmod 777 /var/log/reminders.log /var/log/reset.log /var/log/returnEquipment.log

# copy entrypoint
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN sed -i 's/\r//' /docker-entrypoint.sh && chmod +x /docker-entrypoint.sh

# fix permission
RUN chown -R www-data:www-data /var/www/html

EXPOSE 80

CMD ["/docker-entrypoint.sh"]