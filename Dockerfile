FROM php:8.1-apache

RUN a2enmod rewrite dir

RUN apt-get update && apt-get install -y \
    libonig-dev libzip-dev zip unzip curl cron \
    && docker-php-ext-install mysqli pdo pdo_mysql \
    && rm -rf /var/lib/apt/lists/*

RUN ln -sf /usr/share/zoneinfo/Asia/Bangkok /etc/localtime \
    && echo "Asia/Bangkok" > /etc/timezone

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY . /var/www/html/

# ✅ DocumentRoot อยู่ที่ root ครอบทุกอย่าง
RUN sed -i 's|DocumentRoot /var/www/html|DocumentRoot /var/www/html|g' \
    /etc/apache2/sites-available/000-default.conf \
    && echo '<Directory /var/www/html>\n\
    DirectoryIndex html/login.html index.php index.html\n\
    Options FollowSymLinks\n\
    AllowOverride All\n\
    Require all granted\n\
    </Directory>' >> /etc/apache2/apache2.conf

RUN composer install --no-interaction --no-progress --no-dev

RUN echo "* * * * * root /usr/local/bin/php /var/www/html/src/api/send_reminders.php >> /var/log/reminders.log 2>&1\n\
    0 0 1 * * root /usr/local/bin/php /var/www/html/src/api/resetMonthly.php >> /var/log/reset.log 2>&1\n\
    */30 * * * * root /usr/local/bin/php /var/www/html/src/api/returnEquipment.php >> /var/log/returnEquipment.log 2>&1" > /etc/cron.d/send_reminders \
    && chmod 0644 /etc/cron.d/send_reminders \
    && crontab /etc/cron.d/send_reminders \
    && touch /var/log/reminders.log /var/log/reset.log /var/log/returnEquipment.log \
    && chmod 777 /var/log/reminders.log /var/log/reset.log /var/log/returnEquipment.log

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN sed -i 's/\r//' /docker-entrypoint.sh && chmod +x /docker-entrypoint.sh

RUN chown -R www-data:www-data /var/www/html

EXPOSE 80

CMD ["/docker-entrypoint.sh"]