<?php
require_once __DIR__ . '/../database.php'; // ชี้ไปยังไฟล์ database.php 

$db = new Database();
$pdo = $db->getConnection(); // จะได้ตัวแปร $pdo ใช้ได้กับไฟล์ API ทั้งหมด
?>