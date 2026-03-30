<?php
header("Content-Type: application/json");
require_once __DIR__ . '/../config/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['available' => false, 'message' => 'Invalid request method']);
    exit;
}

try {
    $room_id = $_POST['room_id'] ?? null;
    $date = $_POST['date'] ?? null;
    $start_time = $_POST['start_time'] ?? null;
    $end_time = $_POST['end_time'] ?? null;

    if (!$room_id || !$date || !$start_time || !$end_time) {
        echo json_encode(['available' => false, 'message' => 'Missing required parameters']);
        exit;
    }

    $roomStmt = $pdo->prepare("
        SELECT 
            mr.room_id,
            mr.room_name,
            mr.status as status_id,
            s.status_name
        FROM Meeting_Rooms mr
        LEFT JOIN status s ON mr.status = s.status_id
        WHERE mr.room_id = :room_id
    ");
    $roomStmt->execute(['room_id' => $room_id]);
    $room = $roomStmt->fetch(PDO::FETCH_ASSOC);
    if (!$room) {
        echo json_encode([
            'available' => false,
            'message' => 'ไม่พบห้องประชุมนี้'
        ]);
        exit;
    }

    if ($room['status_id'] == 3) {
        echo json_encode([
            'available' => false,
            'message' => 'ห้องปิดปรับปรุง',
            'status' => $room['status_name'],
            'room_name' => $room['room_name']
        ]);
        exit;
    }
    $stmt = $pdo->prepare("
        SELECT 
            COUNT(*) as booking_count,
            GROUP_CONCAT(CONCAT(start_time, '-', end_time) SEPARATOR ', ') as booked_times
        FROM Bookings 
        WHERE room_id = :room_id 
        AND booking_date = :date 
        AND status != 3
        AND (
            (start_time < :end_time AND end_time > :start_time)
        )
    ");

    $stmt->execute([
        'room_id' => $room_id,
        'date' => $date,
        'start_time' => $start_time,
        'end_time' => $end_time
    ]);

    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    $isBooked = ($result['booking_count'] > 0);

    $available = ($room['status_id'] != 3 && !$isBooked);

    echo json_encode([
        'available' => $available,
        'message' => $available ? 'ห้องว่าง' : ($isBooked ? 'ห้องถูกจองแล้วในช่วงเวลานี้' : 'ห้องปิดปรับปรุง'),
        'room_name' => $room['room_name'],
        'room_status' => $room['status_name'],
        'status_id' => $room['status_id'],
        'booking_count' => $result['booking_count'],
        'booked_times' => $result['booked_times']
    ]);
} catch (PDOException $e) {
    error_log("checkAvailability Error: " . $e->getMessage());
    echo json_encode([
        'available' => false,
        'message' => 'เกิดข้อผิดพลาดในการตรวจสอบห้อง: ' . $e->getMessage()
    ]);
}
