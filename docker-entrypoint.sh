#!/bin/bash
# docker-entrypoint.sh
# Start cron และ Apache พร้อมกัน
# เริ่ม cron service
service cron start
echo "Cron started"

# เริ่ม Apache (foreground เพื่อให้ container ทำงานต่อ)
apache2-foreground