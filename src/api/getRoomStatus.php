<?php
session_start();
require_once __DIR__ . '/../config/config.php';
header("Content-Type: application/json");

try {
    $now = new DateTime();
    $currentDate = $now->format('Y-m-d');
    $currentTime = $now->format('H:i:s');

    $query = "
        SELECT 
            r.room_id,
            r.room_name,
            r.capacity,
            r.floor_number,
            r.open_time,
            r.close_time,
            r.status as room_status
        FROM Meeting_Rooms r
        WHERE r.status = 1
        ORDER BY r.room_name
    ";

    $stmt = $pdo->prepare($query);
    $stmt->execute();
    $rooms = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $roomsWithStatus = [];

    foreach ($rooms as $room) {
        $roomId = $room['room_id'];
        $bookingQuery = "
            SELECT booking_id, start_time, end_time
            FROM Bookings
            WHERE room_id = :room_id
            AND booking_date = :current_date
            AND status = 1
            AND start_time <= :current_time
            AND end_time > :current_time
        ";

        $bookingStmt = $pdo->prepare($bookingQuery);
        $bookingStmt->execute([
            'room_id' => $roomId,
            'current_date' => $currentDate,
            'current_time' => $currentTime
        ]);

        $currentBooking = $bookingStmt->fetch(PDO::FETCH_ASSOC);

        // ตรวจสอบการจองที่กำลังจะมาถึง
        $upcomingQuery = "
            SELECT booking_id, start_time, end_time
            FROM Bookings
            WHERE room_id = :room_id
            AND booking_date = :current_date
            AND status = 1
            AND start_time > :current_time
            ORDER BY start_time ASC
            LIMIT 1
        ";

        $upcomingStmt = $pdo->prepare($upcomingQuery);
        $upcomingStmt->execute([
            'room_id' => $roomId,
            'current_date' => $currentDate,
            'current_time' => $currentTime
        ]);

        $upcomingBooking = $upcomingStmt->fetch(PDO::FETCH_ASSOC);
        $status = 'available';
        $statusInfo = '';

        if ($currentBooking) {
            $status = 'occupied';
            $statusInfo = "ใช้งานจนถึง " . substr($currentBooking['end_time'], 0, 5);
        } elseif ($upcomingBooking) {
            $status = 'reserved';
            $statusInfo = "จองเวลา " . substr($upcomingBooking['start_time'], 0, 5);
        }

        $roomsWithStatus[] = [
            'room_id' => $room['room_id'],
            'room_name' => $room['room_name'],
            'capacity' => $room['capacity'],
            'floor_number' => $room['floor_number'],
            'status' => $status,
            'status_info' => $statusInfo
        ];
    }

    echo json_encode([
        "status" => "success",
        "data" => $roomsWithStatus,
        "timestamp" => $now->format('Y-m-d H:i:s')
    ]);
} catch (PDOException $e) {
    error_log("Database Error: " . $e->getMessage());
    echo json_encode([
        "status" => "error",
        "message" => "เกิดข้อผิดพลาดในการดึงข้อมูล"
    ]);
}
