<?php
header('Content-Type: application/json');
require_once '../database.php';

$database = new Database();
$pdo = $database->getConnection();
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = trim($_POST['email'] ?? '');
    $password = trim($_POST['password'] ?? '');
    $confirmPassword = trim($_POST['confirmPassword'] ?? '');
    $fname = trim($_POST['fname'] ?? '');
    $lname = trim($_POST['lname'] ?? '');
    $phone = trim($_POST['phone'] ?? '');

    if (empty($email) || empty($password) || empty($fname) || empty($lname)) {
        echo json_encode(['success' => false, 'message' => 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน']);
        exit;
    }

    if ($password !== $confirmPassword) {
        echo json_encode(['success' => false, 'message' => 'รหัสผ่านไม่ตรงกัน']);
        exit;
    }

    try {
        $stmt = $pdo->prepare("SELECT user_id FROM users WHERE email = ?");
        $stmt->execute([$email]);

        if ($stmt->rowCount() > 0) {
            echo json_encode(['success' => false, 'message' => 'อีเมลนี้มีอยู่ในระบบแล้ว']);
            exit;
        }

        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

        $stmt = $pdo->prepare("INSERT INTO users (email, user_password, fname, lname, phone, role_id, priority_level, is_banned, cancellation_count, cancellation_reset)
                               VALUES (?, ?, ?, ?, ?, 3, 60, 0, 0, 0)");

        $stmt->execute([$email, $hashedPassword, $fname, $lname, $phone]);
        echo json_encode(['success' => true, 'message' => 'สมัครสมาชิกสำเร็จ! กำลังนำไปยังหน้าเข้าสู่ระบบ']);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' . $e->getMessage()]);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'ต้องเข้าถึงด้วยวิธี POST เท่านั้น']);
}
