<?php
// ไฟล์: ./src/database.php หรือไฟล์เชื่อมต่อฐานข้อมูลของคุณ

// 1. ดึงค่าจาก Environment Variables (ถ้าคุณใช้ getenv() ในโค้ด)
// ตรวจสอบให้แน่ใจว่าค่าเหล่านี้ตรงกับที่คุณกำหนดใน docker-compose.yml
$host = getenv('DB_HOST') ?: 'mysql-database';
$user = getenv('DB_USER') ?: 'root';             // <--- ใช้ root
$pass = getenv('DB_PASSWORD') ?: 'MySecureRootPass'; // <--- ใช้รหัสผ่านใหม่
$db   = getenv('DB_NAME') ?: 'db_amita';

// หากคุณไม่ได้ใช้ getenv() ให้กำหนดค่าตรงๆ (Hardcode)
// $host = 'mysql-database';
// $user = 'root';
// $pass = 'MySecureRootPass';
// $db   = 'db_amita';


$charset = 'utf8mb4';
$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
     $pdo = new PDO($dsn, $user, $pass, $options);
     echo "Connection success! Host: $host";
} catch (\PDOException $e) {
     // แสดงข้อผิดพลาดเพื่อช่วยในการ Debug
     die("Connection Failed: " . $e->getMessage());
}
?>