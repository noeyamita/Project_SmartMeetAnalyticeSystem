<?php
session_start();
date_default_timezone_set('Asia/Bangkok');
header("Content-Type: application/json");
ini_set('display_errors', 0);
require_once __DIR__ . '/../config/config.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(["status" => "error", "message" => "Please login"]);
    exit;
}
$userId = $_SESSION['user_id'];

try {
    $stmt = $pdo->prepare("
        SELECT r.room_id, r.room_name, r.capacity, r.open_time, r.close_time, COUNT(b.booking_id) as freq
        FROM Bookings b
        JOIN Meeting_Rooms r ON b.room_id = r.room_id
        WHERE b.user_id = :user_id AND b.status = 1
        GROUP BY r.room_id
        ORDER BY freq DESC LIMIT 5
    ");
    $stmt->execute(['user_id' => $userId]);
    $popularRooms = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($popularRooms)) {
        $stmt = $pdo->query("SELECT room_id, room_name, capacity, open_time, close_time FROM Meeting_Rooms LIMIT 5");
        $popularRooms = $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    $currentDate = date('Y-m-d');

    $bookingStart = date('H:i:s', strtotime('+3 hours 10 minutes'));

    $bookingEnd = date('H:i:s', strtotime('+4 hours'));

    if ($bookingEnd < $bookingStart) {
        $bookingEnd = '23:59:59';
    }

    $results = [];
    foreach ($popularRooms as $room) {
        $status = 'available';
        if ($bookingStart < $room['open_time'] || $bookingEnd > $room['close_time']) {
            $status = 'unavailable';
        } else {
            $checkStmt = $pdo->prepare("
                SELECT booking_id FROM Bookings
                WHERE room_id = :room_id AND booking_date = :bdate AND status = 1
                AND (start_time < :end_time AND end_time > :start_time)
            ");
            $checkStmt->execute([
                'room_id' => $room['room_id'],
                'bdate' => $currentDate,
                'start_time' => $bookingStart,
                'end_time' => $bookingEnd
            ]);

            if ($checkStmt->rowCount() > 0) {
                $status = 'occupied'; // ไม่ว่าง ติดจอง
            }
        }

        $results[] = [
            'room_id' => $room['room_id'],
            'room_name' => $room['room_name'],
            'capacity' => $room['capacity'],
            'status' => $status,
            'start_time' => date('H:i', strtotime($bookingStart)),
            'end_time' => date('H:i', strtotime($bookingEnd))
        ];
    }

    echo json_encode(["status" => "success", "data" => $results]);
} catch (Exception $e) {
    echo json_encode(["status" => "error", "message" => "System Error"]);
}
