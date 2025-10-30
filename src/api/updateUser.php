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

    // อ่านข้อมูล JSON ที่ส่งมา
    $input = json_decode(file_get_contents('php://input'), true);
    
    $userId = $_SESSION['user_id'];
    $fname = isset($input['fname']) ? trim($input['fname']) : null;
    $lname = isset($input['lname']) ? trim($input['lname']) : null;
    $phone = isset($input['phone']) ? trim($input['phone']) : null;

    // ตรวจสอบข้อมูล
    if (empty($fname) || empty($lname)) {
        echo json_encode([
            "status" => "error",
            "message" => "First name and last name are required"
        ]);
        exit;
    }

    // อัปเดตข้อมูล
    $stmt = $pdo->prepare("
        UPDATE users 
        SET fname = :fname, 
            lname = :lname, 
            phone = :phone
        WHERE user_id = :user_id
    ");

    $result = $stmt->execute([
        'fname' => $fname,
        'lname' => $lname,
        'phone' => $phone,
        'user_id' => $userId
    ]);

    if ($result) {
        echo json_encode([
            "status" => "success",
            "message" => "Profile updated successfully"
        ]);
    } else {
        echo json_encode([
            "status" => "error",
            "message" => "Failed to update profile"
        ]);
    }

} catch (PDOException $e) {
    error_log("Update User Error: " . $e->getMessage());
    echo json_encode([
        "status" => "error",
        "message" => "Database error: " . $e->getMessage()
    ]);
}
?>