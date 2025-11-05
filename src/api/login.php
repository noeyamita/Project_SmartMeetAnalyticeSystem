<?php
session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/../database.php'; 

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
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            echo json_encode(['success' => false, 'message' => 'ไม่พบผู้ใช้นี้ในระบบ']);
            exit;
        }

        if (!password_verify($password, $user['user_password'])) {
            echo json_encode(['success' => false, 'message' => 'รหัสผ่านไม่ถูกต้อง']);
            exit;
        }

        // สร้าง session หลังเข้าสู่ระบบสำเร็จ
        $_SESSION['user_id'] = $user['user_id'];
        $_SESSION['fname'] = $user['fname'];
        $_SESSION['lname'] = $user['lname'];
        $_SESSION['role_id'] = $user['role_id'];
        $_SESSION['email'] = $user['email'];

        session_regenerate_id(true);

        // ✅ ดึงชื่อ role จากตาราง role
        $roleStmt = $pdo->prepare("SELECT role_name FROM role WHERE role_id = ?");
        $roleStmt->execute([$user['role_id']]);
        $role = $roleStmt->fetch(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'message' => 'เข้าสู่ระบบสำเร็จ',
            'role_id' => $user['role_id'],
            'role_name' => $role['role_name'] ?? 'Normal', // ส่งชื่อ role กลับไปด้วย
            'user_name' => $user['fname'] . ' ' . $user['lname']
        ]);

    } catch (PDOException $e) {
        echo json_encode([
            'success' => false,
            'message' => 'Database error: ' . $e->getMessage()
        ]);
    }
}
?>