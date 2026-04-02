<?php
session_start();
header("Content-Type: application/json");
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/Notification.php';

if (!isset($_SESSION['user_id']) || strtolower($_SESSION['role_name'] ?? '') !== 'admin') {
    echo json_encode(["status" => "error", "message" => "ไม่มีสิทธิ์เข้าถึง"]);
    exit;
}

$input      = json_decode(file_get_contents("php://input"), true);
$booking_id = intval($input['booking_id'] ?? 0);

if ($booking_id <= 0) {
    echo json_encode(["status" => "error", "message" => "booking_id ไม่ถูกต้อง"]);
    exit;
}

try {
    $pdo->beginTransaction();
    $stmt = $pdo->prepare("SELECT booking_id, user_id, status FROM Bookings WHERE booking_id = ? AND status = 4");
    $stmt->execute([$booking_id]);
    $booking = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$booking) {
        echo json_encode(["status" => "error", "message" => "ไม่พบการจองนี้ หรือสถานะไม่ถูกต้อง"]);
        exit;
    }

    // คืนอุปกรณ์
    $pdo->prepare("
        UPDATE Equipment e
        JOIN Booking_Equipment be ON e.equipment_id = be.equipment_id
        SET e.quantity = e.quantity + be.quantity
        WHERE be.booking_id = ?
    ")->execute([$booking_id]);

    // ถ้า admin เป็นคนยกเลิก = ไม่นับ cancellation_count ของ user
    $pdo->prepare("
        UPDATE Bookings SET status = 2, updated_at = NOW() WHERE booking_id = ?
    ")->execute([$booking_id]);

    $pdo->commit();

    // แจ้งเตือน user ว่าการจองถูกยกเลิก
    $helper = new NotificationHelper();
    $helper->notifyCancelledByAdmin($booking_id);

    echo json_encode(["status" => "success", "message" => "ยกเลิกการจองและคืนอุปกรณ์สำเร็จ"]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log("adminCancelBooking error: " . $e->getMessage());
    echo json_encode(["status" => "error", "message" => "System Error: " . $e->getMessage()]);
}
