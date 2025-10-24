<?php
// กำหนด Content-Type เป็น JSON เพื่อให้ client (JavaScript) ทราบว่าข้อมูลที่ส่งกลับมาเป็น JSON
header('Content-Type: application/json');

require_once '../database.php';

// สร้าง object ของ Database และเชื่อมต่อ PDO
$database = new Database();
$pdo = $database->getConnection();

// ตรวจสอบว่าเป็นวิธีการ POST เท่านั้น (มาจากฟอร์ม HTML)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // รับค่าและทำความสะอาดข้อมูลที่ส่งมาจากฟอร์ม HTML
    // (ใช้ $_POST['name']??'' เพื่อป้องกัน Warning/Notice หากค่าไม่มีการส่งมา)
    $email = trim($_POST['email'] ?? '');
    $password = trim($_POST['password'] ?? '');
    $confirmPassword = trim($_POST['confirmPassword'] ?? '');
    $fname = trim($_POST['fname'] ?? '');
    $lname = trim($_POST['lname'] ?? '');
    $phone = trim($_POST['phone'] ?? '');

    //1. ตรวจสอบค่าว่าง
    if (empty($email) || empty($password) || empty($fname) || empty($lname)) {
        echo json_encode(['success' => false, 'message' => 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน']);
        exit;
    }

    //2. ตรวจสอบรหัสผ่านตรงกัน (ซ้ำซ้อนกับการตรวจสอบใน JS แต่ทำเพื่อความปลอดภัยฝั่งเซิร์ฟเวอร์)
    if ($password !== $confirmPassword) {
        echo json_encode(['success' => false, 'message' => 'รหัสผ่านไม่ตรงกัน']);
        exit;
    }

    try {
        // 3. ตรวจสอบว่าอีเมลซ้ำไหม (ใช้ Prepared Statement)
        $stmt = $pdo->prepare("SELECT user_id FROM users WHERE email = ?");
        $stmt->execute([$email]);

        if ($stmt->rowCount() > 0) {
            echo json_encode(['success' => false, 'message' => 'อีเมลนี้มีอยู่ในระบบแล้ว']);
            exit;
        }

        // 4. เข้ารหัสรหัสผ่านก่อนเก็บ (สำคัญมาก)
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

        // 5. บันทึกลงฐานข้อมูล (ใช้ Prepared Statement)
        $stmt = $pdo->prepare("INSERT INTO users (email, user_password, fname, lname, phone, role_id, priority_level, is_banned, cancellation_count, cancellation_reset)
                               VALUES (?, ?, ?, ?, ?, 3, 1, 60, 0, 0)");
        
        $stmt->execute([$email, $hashedPassword, $fname, $lname, $phone]);

        // 6. ส่งผลลัพธ์สำเร็จ
        echo json_encode(['success' => true, 'message' => 'สมัครสมาชิกสำเร็จ! กำลังนำไปยังหน้าเข้าสู่ระบบ']);
    } catch (PDOException $e) {
        // 7. จัดการข้อผิดพลาดฐานข้อมูล
        // การแสดง $e->getMessage() เป็นประโยชน์ในการ Debug แต่ควรลบออกในการใช้งานจริง
        echo json_encode(['success' => false, 'message' => 'เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' . $e->getMessage()]);
    }
} else {
    // หากเข้าถึงโดยตรงด้วยวิธี GET หรืออื่น ๆ 
    echo json_encode(['success' => false, 'message' => 'ต้องเข้าถึงด้วยวิธี POST เท่านั้น']);
}
?>