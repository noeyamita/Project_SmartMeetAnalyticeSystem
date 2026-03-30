<?php
session_start();
header("Content-Type: application/json");
require_once __DIR__ . '/../config/config.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(["status" => "error", "message" => "Please login first"]);
    exit;
}

$userId = $_SESSION['user_id'];
$data = json_decode(file_get_contents("php://input"), true);

if (!$data) {
    echo json_encode(["status" => "error", "message" => "Invalid request data"]);
    exit;
}

try {
    $fname = trim($data['fname']);
    $lname = trim($data['lname']);
    $phone = trim($data['phone']);

    $isEmailChanged = isset($data['email']) && !empty(trim($data['email']));

    if ($isEmailChanged) {
        $newEmail = trim($data['email']);
        $currentPassword = $data['current_password'] ?? '';

        if (empty($currentPassword)) {
            echo json_encode(["status" => "error", "message" => "กรุณากรอกรหัสผ่านเพื่อยืนยันการเปลี่ยนอีเมล"]);
            exit;
        }

        $stmt = $pdo->prepare("SELECT user_password FROM users WHERE user_id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user || !password_verify($currentPassword, $user['user_password'])) {
            echo json_encode(["status" => "error", "message" => "รหัสผ่านปัจจุบันไม่ถูกต้อง!"]);
            exit;
        }

        $stmtEmail = $pdo->prepare("SELECT user_id FROM users WHERE email = ? AND user_id != ?");
        $stmtEmail->execute([$newEmail, $userId]);
        if ($stmtEmail->rowCount() > 0) {
            echo json_encode(["status" => "error", "message" => "อีเมลนี้มีผู้ใช้งานแล้ว!"]);
            exit;
        }
    }

    $updateFields = ["fname = ?", "lname = ?", "phone = ?"];
    $params = [$fname, $lname, $phone];

    if ($isEmailChanged) {
        $updateFields[] = "email = ?";
        $params[] = $newEmail;
    }

    $params[] = $userId;

    $sql = "UPDATE users SET " . implode(", ", $updateFields) . " WHERE user_id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    echo json_encode([
        "status" => "success",
        "message" => "อัปเดตข้อมูลโปรไฟล์เรียบร้อยแล้ว"
    ]);
} catch (PDOException $e) {
    error_log("Update User Error: " . $e->getMessage());
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
