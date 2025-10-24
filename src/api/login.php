<?php
session_start();
header('Content-Type: application/json');
require_once '../database.php';

$database = new Database();
$pdo = $database->getConnection();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = trim($_POST['email'] ?? '');
    $password = trim($_POST['password'] ?? '');

    if (empty($email) || empty($password)) {
        echo json_encode(['success' => false, 'message' => 'กรุณากรอกอีเมลและรหัสผ่าน']);
        exit;
    }

    try {
        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user) {
            echo json_encode(['success' => false, 'message' => 'ไม่พบผู้ใช้นี้ในระบบ']);
            exit;
        }

        if (!password_verify($password, $user['user_password'])) {
            echo json_encode(['success' => false, 'message' => 'รหัสผ่านไม่ถูกต้อง']);
            exit;
        }

        // ✅ สร้าง session หลังเข้าสู่ระบบ
        $_SESSION['user_id'] = $user['user_id'];
        $_SESSION['fname'] = $user['fname'];
        $_SESSION['lname'] = $user['lname'];
        $_SESSION['role_id'] = $user['role_id'];

        echo json_encode(['success' => true, 'message' => 'เข้าสู่ระบบสำเร็จ']);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'เกิดข้อผิดพลาด: ' . $e->getMessage()]);
    }
}
?>
