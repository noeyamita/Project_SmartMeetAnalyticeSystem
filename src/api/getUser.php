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

    $userId = $_SESSION['user_id'];

    // ดึงข้อมูลผู้ใช้จากฐานข้อมูล
    $stmt = $pdo->prepare("
        SELECT user_id, email, fname, lname, phone, role_id, 
               priority_level, is_banned, cancellation_count, cancellation_reset
        FROM users
        WHERE user_id = :user_id
    ");
    
    $stmt->execute(['user_id' => $userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        echo json_encode([
            "status" => "error",
            "message" => "User not found"
        ]);
        exit;
    }

    // ซ่อนข้อมูลที่ sensitive
    unset($user['user_password']);

    echo json_encode([
        "status" => "success",
        "data" => $user
    ]);

} catch (PDOException $e) {
    error_log("Get User Error: " . $e->getMessage());
    echo json_encode([
        "status" => "error",
        "message" => "Database error: " . $e->getMessage()
    ]);
}
?>