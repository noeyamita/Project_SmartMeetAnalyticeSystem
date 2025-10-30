<?php
session_start();
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: http://localhost:5500");
header("Access-Control-Allow-Credentials: true");

// --- 1. ตรวจสอบว่ามีการเข้าสู่ระบบแล้วหรือไม่ ---
if (!isset($_SESSION['user_id'])) {
    echo json_encode([
        "status" => "error", 
        "message" => "ไม่พบ Session User ID กรุณาเข้าสู่ระบบใหม่" // เปลี่ยนข้อความเป็นแจ้งให้ล็อกอิน
    ]);
    exit;
}

// กำหนดตัวแปร user_id ที่จะใช้
$userId = $_SESSION['user_id'];

error_reporting(0);
ini_set('display_errors', 0);

header("Content-Type: application/json");
require_once __DIR__ . '/../config/config.php';

$data = json_decode(file_get_contents("php://input"), true);
if (!$data) {
    echo json_encode(["status" => "error", "message" => "Invalid JSON data"]);
    exit;
}


// แปลงเวลาจาก "09:00:00" เป็น 9.00
function timeToDecimal($time) {
    list($hour, $minute) = explode(':', $time);
    return floatval($hour) + (floatval($minute) / 60);
}

try {
    $stmt = $pdo->prepare("
        INSERT INTO Bookings 
        (user_id, room_id, booking_date, start_time, end_time, purpose, attendees_count, table_layout, status, is_moved, original_room_id, created_at, updated_at)
        VALUES (:user_id, :room_id, :booking_date, :start_time, :end_time, :purpose, :attendees_count, :table_layout, 1, 0, NULL, NOW(), NOW())
    ");

    $stmt->execute([
        ":user_id" => $userId, // ใช้ $userId (จาก Session)
        ":room_id" => $data['room_id'],
        ":booking_date" => $data['booking_date'],
        ":start_time" => timeToDecimal($data['start_time']),
        ":end_time" => timeToDecimal($data['end_time']),
        ":purpose" => $data['purpose'],
        ":attendees_count" => $data['attendees_count'],
        ":table_layout" => $data['table_layout']
    ]);

    echo json_encode(["status" => "success", "message" => "Booking created successfully"]);
} catch (PDOException $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>