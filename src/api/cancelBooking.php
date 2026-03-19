<?php
session_start();
ini_set('display_errors', 0); 
header("Content-Type: application/json");
require_once __DIR__ . '/../config/config.php';
define('STATUS_SUCCESS', 1);      
define('STATUS_CANCELLED', 2);    
define('STATUS_PENDING', 3);    

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

    $startTime = $booking['start_time']; 
    $bookingDateTime = $booking['booking_date'] . ' ' . $startTime;
    $bookingTimestamp = strtotime($bookingDateTime);
    $currentTimestamp = time();
    if ($currentTimestamp >= $bookingTimestamp) {
        echo json_encode([
            "status" => "error",
            "message" => "ไม่สามารถยกเลิกได้ เนื่องจากเวลาการจองได้ผ่านไปแล้ว"
        ]);
        exit;
    }

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