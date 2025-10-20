FROM php:8.2-apache

# ติดตั้ง extensions ที่จำเป็น
RUN apt-get update && apt-get install -y \
    libpq-dev \
    && docker-php-ext-install pdo_mysql pdo_pgsql mysqli

# เปิด mod_rewrite สำหรับ URL rewriting
RUN a2enmod rewrite

# กำหนด working directory
WORKDIR /var/www/html

# คัดลอก source code ไปยัง container
COPY src/ /var/www/html/

# ตั้งค่า permissions
RUN chown -R www-data:www-data /var/www/html

EXPOSE 80