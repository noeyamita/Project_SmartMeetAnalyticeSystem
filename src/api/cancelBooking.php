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

    // ตรวจสอบว่าการจองนี้เป็นของผู้ใช้คนนี้หรือไม่
    $stmt = $pdo->prepare("
        SELECT booking_id, status, user_id 
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

    if ($booking['status'] === 'cancelled') {
        echo json_encode([
            "status" => "error",
            "message" => "This booking is already cancelled"
        ]);
        exit;
    }

    if ($booking['status'] === 'completed') {
        echo json_encode([
            "status" => "error",
            "message" => "Cannot cancel completed booking"
        ]);
        exit;
    }

    // อัปเดตสถานะเป็น cancelled
    $stmt = $pdo->prepare("
        UPDATE Bookings 
        SET status = 'cancelled' 
        WHERE booking_id = :booking_id
    ");
    
    $result = $stmt->execute(['booking_id' => $bookingId]);

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
            "message" => "Booking cancelled successfully"
        ]);
    } else {
        echo json_encode([
            "status" => "error",
            "message" => "Failed to cancel booking"
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