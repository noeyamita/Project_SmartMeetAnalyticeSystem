#!/bin/bash
# docker-entrypoint.sh

# เริ่ม cron daemon ตรงๆ
cron
echo "Cron started"

# เริ่ม Apache (foreground เพื่อให้ container ทำงานต่อ)
apache2-foreground