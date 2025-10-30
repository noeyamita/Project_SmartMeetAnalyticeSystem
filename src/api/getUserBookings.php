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

    // ดึงประวัติการจองทั้งหมดของผู้ใช้
    $stmt = $pdo->prepare("
        SELECT 
            b.booking_id,
            b.booking_date,
            b.start_time,
            b.end_time,
            b.purpose,
            b.attendees_count,
            b.status,
            b.created_at,
            r.room_name,
            r.floor_number
        FROM Bookings b
        INNER JOIN Meeting_Rooms r ON b.room_id = r.room_id
        WHERE b.user_id = :user_id
        ORDER BY b.booking_date DESC, b.start_time DESC
    ");
    
    $stmt->execute(['user_id' => $userId]);
    $bookings = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // จัดรูปแบบข้อมูล
    $formattedBookings = array_map(function($booking) {
        return [
            'id' => $booking['booking_id'],
            'room' => $booking['room_name'],
            'floor' => $booking['floor_number'],
            'date' => date('d/m/Y', strtotime($booking['booking_date'])),
            'time' => sprintf('%s - %s', 
                str_replace('.', ':', $booking['start_time']), 
                str_replace('.', ':', $booking['end_time'])
            ),
            'purpose' => $booking['purpose'],
            'attendees' => $booking['attendees_count'],
            'status' => strtolower($booking['status']),
            'created_at' => $booking['created_at']
        ];
    }, $bookings);

    echo json_encode([
        "status" => "success",
        "data" => $formattedBookings,
        "count" => count($formattedBookings)
    ]);

} catch (PDOException $e) {
    error_log("Get Bookings Error: " . $e->getMessage());
    echo json_encode([
        "status" => "error",
        "message" => "Database error: " . $e->getMessage()
    ]);
}
?>