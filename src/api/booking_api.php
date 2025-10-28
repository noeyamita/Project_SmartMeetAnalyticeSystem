<?php
session_start();
header('Content-Type: application/json');
require_once '../database.php';

$database = new Database();
$pdo = $database->getConnection();


function checkRoomAvailability($room_id, $date, $start_time, $end_time) {
    // ตรวจสอบว่าห้องว่างในช่วงเวลานั้นหรือไม่
    $sql = "SELECT COUNT(*) FROM Bookings 
            WHERE room_id = ? 
            AND booking_date = ? 
            AND status != 3 
            AND ((start_time < ? AND end_time > ?) 
            OR (start_time < ? AND end_time > ?))";
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // ตรวจสอบว่าผู้ใช้เข้าสู่ระบบแล้วหรือไม่
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'message' => 'กรุณาเข้าสู่ระบบก่อนทำการจอง']);
        exit;
    }

    $user_id = $_SESSION['user_id'];
    $booking_date = trim($_POST['booking_date'] ?? '');
    $booking_time = trim($_POST['booking_time'] ?? '');
    $service_id = trim($_POST['service_id'] ?? '');

    if (empty($booking_date) || empty($booking_time) || empty($service_id)) {
        echo json_encode(['success' => false, 'message' => 'กรุณากรอกข้อมูลการจองให้ครบถ้วน']);
        exit;
    }

    try {
        $stmt = $pdo->prepare("INSERT INTO bookings (user_id, service_id, booking_date, booking_time) VALUES (?, ?, ?, ?)");
        $stmt->execute([$user_id, $service_id, $booking_date, $booking_time]);

        echo json_encode(['success' => true, 'message' => 'การจองสำเร็จ']);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'เกิดข้อผิดพลาด: ' . $e->getMessage()]);
    }
}
?>
