<?php
// แสดง error ทั้งหมด
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<h3>PHP Version: " . phpversion() . "</h3>";

// ตรวจสอบ PDO MySQL
if (extension_loaded('pdo_mysql')) {
    echo "✅ PDO MySQL extension loaded<br>";
} else {
    echo "❌ PDO MySQL extension NOT loaded<br>";
}

// ลองเชื่อมต่อ
require 'database.php';

try {
    $db = new Database();
    $pdo = $db->getConnection();
    
    $stmt = $pdo->query("SELECT DATABASE() as db_name");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo "✅ เชื่อมต่อ Database สำเร็จ!<br>";
    echo "Database: " . $result['db_name'];
} catch (Exception $e) {
    echo "❌ ข้อผิดพลาด: " . $e->getMessage();
}
?>