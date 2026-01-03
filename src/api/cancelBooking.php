<?php
session_start();
header("Content-Type: application/json");
require_once __DIR__ . '/../config/config.php';

// กำหนด status constants ตามตาราง status
define('STATUS_SUCCESS', 1);      // จองสำเร็จ
define('STATUS_CANCELLED', 2);    // ยกเลิกการจอง
define('STATUS_PENDING', 3);      // รออนุมัติการย้ายห้อง

// ฟังก์ชันแปลง Decimal -> HH:MM (ตรงข้ามกับ timeToDecimal)
function decimalToTime($decimal) {
    $hours = floor($decimal);
    $minutes = round(($decimal - $hours) * 100); // แปลง .40 เป็น 40 นาที
    return sprintf("%02d:%02d", $hours, $minutes);
}

try {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode([
            "status" => "error",
            "message" => "Please login first"
        ]);
        exit;
    }

    $input = json_decode(file_get_contents('php://input'), true);
    $bookingId = isset($input['booking_id']) ? intval($input['booking_id']) : 0;
    $userId = $_SESSION['user_id'];

    if ($bookingId <= 0) {
        echo json_encode([
            "status" => "error",
            "message" => "Invalid booking ID"
        ]);
        exit;
    }

    // ดึงข้อมูลการจองพร้อมวันที่และเวลา
    $stmt = $pdo->prepare("
        SELECT booking_id, status, user_id, booking_date, start_time 
        FROM Bookings 
        WHERE booking_id = :booking_id
    ");
    $stmt->execute(['booking_id' => $bookingId]);
    $booking = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$booking) {
        echo json_encode([
            "status" => "error",
            "message" => "Booking not found"
        ]);
        exit;
    }

    if ($booking['user_id'] != $userId) {
        echo json_encode([
            "status" => "error",
            "message" => "You don't have permission to cancel this booking"
        ]);
        exit;
    }

    if ($booking['status'] == STATUS_CANCELLED) {
        echo json_encode([
            "status" => "error",
            "message" => "การจองนี้ถูกยกเลิกไปแล้ว"
        ]);
        exit;
    }

    // แปลง start_time จาก decimal เป็น HH:MM
    $startTimeFormatted = decimalToTime($booking['start_time']);
    
    // สร้าง DateTime สำหรับเปรียบเทียบ
    $bookingDateTime = $booking['booking_date'] . ' ' . $startTimeFormatted . ':00';
    $bookingTimestamp = strtotime($bookingDateTime);
    $currentTimestamp = time();

    // Debug log
    error_log("=== Cancel Booking Debug ===");
    error_log("Booking Date: " . $booking['booking_date']);
    error_log("Start Time (decimal): " . $booking['start_time']);
    error_log("Start Time (formatted): " . $startTimeFormatted);
    error_log("Booking DateTime: " . $bookingDateTime);
    error_log("Booking Timestamp: " . date('Y-m-d H:i:s', $bookingTimestamp));
    error_log("Current Timestamp: " . date('Y-m-d H:i:s', $currentTimestamp));
    error_log("Can Cancel: " . ($currentTimestamp < $bookingTimestamp ? 'YES' : 'NO'));

    // ตรวจสอบว่าเวลาผ่านมาแล้วหรือยัง
    if ($currentTimestamp >= $bookingTimestamp) {
        echo json_encode([
            "status" => "error",
            "message" => "ไม่สามารถยกเลิกได้ เนื่องจากเวลาการจองได้ผ่านไปแล้ว"
        ]);
        exit;
    }

    // อัปเดตสถานะเป็น 2 (ยกเลิกการจอง)
    $stmt = $pdo->prepare("
        UPDATE Bookings 
        SET status = :status 
        WHERE booking_id = :booking_id
    ");
    
    $result = $stmt->execute([
        'status' => STATUS_CANCELLED,
        'booking_id' => $bookingId
    ]);

    if ($result) {
        // อัปเดตจำนวนการยกเลิกของผู้ใช้
        $stmt = $pdo->prepare("
            UPDATE users 
            SET cancellation_count = cancellation_count + 1 
            WHERE user_id = :user_id
        ");
        $stmt->execute(['user_id' => $userId]);

        echo json_encode([
            "status" => "success",
            "message" => "ยกเลิกการจองสำเร็จ"
        ]);
    } else {
        echo json_encode([
            "status" => "error",
            "message" => "ไม่สามารถยกเลิกการจองได้"
        ]);
    }

} catch (PDOException $e) {
    error_log("Cancel Booking Error: " . $e->getMessage());
    echo json_encode([
        "status" => "error",
        "message" => "Database error: " . $e->getMessage()
    ]);
}
?>