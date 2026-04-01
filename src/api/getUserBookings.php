<?php
session_start();
header("Content-Type: application/json");
require_once __DIR__ . '/../config/config.php';

try {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(["status" => "error", "message" => "Please login first"]);
        exit;
    }

    $userId = $_SESSION['user_id'];

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
            b.is_moved,
            r.room_name,
            r.floor_number,
            r_old.room_name AS original_room_name,
            r_old.floor_number AS original_floor_number
        FROM Bookings b
        INNER JOIN Meeting_Rooms r ON b.room_id = r.room_id
        LEFT JOIN Meeting_Rooms r_old ON b.original_room_id = r_old.room_id
        WHERE b.user_id = :user_id
        ORDER BY b.booking_date DESC, b.start_time DESC
    ");

    $stmt->execute(['user_id' => $userId]);
    $bookings = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $formattedBookings = array_map(function ($booking) {
        $startTime = substr($booking['start_time'], 0, 5);
        $endTime   = substr($booking['end_time'], 0, 5);

        $data = [
            'id'         => $booking['booking_id'],
            'room'       => $booking['room_name'],
            'floor'      => $booking['floor_number'],
            'date'       => date('d/m/Y', strtotime($booking['booking_date'])),
            'time'       => "{$startTime} - {$endTime}",
            'purpose'    => $booking['purpose'],
            'attendees'  => $booking['attendees_count'],
            'status_id'  => (int)$booking['status'],
            'status'     => strtolower($booking['status']),
            'created_at' => $booking['created_at'],
            'is_moved'   => (bool)$booking['is_moved'],
        ];

        // ถ้าถูกย้ายห้อง ให้ส่งข้อมูลห้องเก่าด้วย
        if ($booking['is_moved'] && $booking['original_room_name']) {
            $data['original_room'] = $booking['original_room_name']
                . (!empty($booking['original_floor_number']) ? " ({$booking['original_floor_number']})" : "");
            $data['new_room'] = $booking['room_name']
                . (!empty($booking['floor_number']) ? " ({$booking['floor_number']})" : "");
        }

        return $data;
    }, $bookings);

    echo json_encode([
        "status" => "success",
        "data"   => $formattedBookings,
        "count"  => count($formattedBookings)
    ]);
} catch (PDOException $e) {
    error_log("Get Bookings Error: " . $e->getMessage());
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
