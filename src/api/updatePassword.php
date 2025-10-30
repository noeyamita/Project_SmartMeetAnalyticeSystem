<?php
session_start();
header("Content-Type: application/json");
require_once __DIR__ . '/../config/config.php';

try {
    // ตรวจสอบว่ามีการ login หรือไม่
    if (!isset($_SESSION['user_id'])) {
        echo json_encode([
            "status" => "error",
            "message" => "Please login first"
        ]);
        exit;
    }

    // อ่านข้อมูล JSON
    $input = json_decode(file_get_contents('php://input'), true);
    
    $userId = $_SESSION['user_id'];
    $currentPassword = isset($input['current_password']) ? $input['current_password'] : null;
    $newPassword = isset($input['new_password']) ? $input['new_password'] : null;

    // ตรวจสอบข้อมูล
    if (empty($currentPassword) || empty($newPassword)) {
        echo json_encode([
            "status" => "error",
            "message" => "Current password and new password are required"
        ]);
        exit;
    }

    if (strlen($newPassword) < 6) {
        echo json_encode([
            "status" => "error",
            "message" => "Password must be at least 6 characters long"
        ]);
        exit;
    }

    // ดึงรหัสผ่านปัจจุบันจากฐานข้อมูล
    $stmt = $pdo->prepare("SELECT user_password FROM users WHERE user_id = :user_id");
    $stmt->execute(['user_id' => $userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        echo json_encode([
            "status" => "error",
            "message" => "User not found"
        ]);
        exit;
    }

    // ตรวจสอบรหัสผ่านปัจจุบัน
    if (!password_verify($currentPassword, $user['user_password'])) {
        echo json_encode([
            "status" => "error",
            "message" => "Current password is incorrect"
        ]);
        exit;
    }

    // แฮชรหัสผ่านใหม่
    $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);

    // อัปเดตรหัสผ่าน
    $stmt = $pdo->prepare("
        UPDATE users 
        SET user_password = :password 
        WHERE user_id = :user_id
    ");

    $result = $stmt->execute([
        'password' => $hashedPassword,
        'user_id' => $userId
    ]);

    if ($result) {
        echo json_encode([
            "status" => "success",
            "message" => "Password updated successfully"
        ]);
    } else {
        echo json_encode([
            "status" => "error",
            "message" => "Failed to update password"
        ]);
    }

} catch (PDOException $e) {
    error_log("Update Password Error: " . $e->getMessage());
    echo json_encode([
        "status" => "error",
        "message" => "Database error: " . $e->getMessage()
    ]);
}
?>