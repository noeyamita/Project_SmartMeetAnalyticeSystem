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

    // ตรวจสอบสถานะห้องจาก Meeting_Rooms JOIN กับตาราง status
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

    // ถ้าไม่พบห้อง
    if (!$room) {
        echo json_encode([
            'available' => false, 
            'message' => 'ไม่พบห้องประชุมนี้'
        ]);
        exit;
    }

    // ตรวจสอบสถานะห้อง
    // status_id: 1 = ห้องว่าง, 2 = ถูกจอง, 3 = ปิดปรับปรุง
    if ($room['status_id'] == 3) {
        echo json_encode([
            'available' => false,
            'message' => 'ห้องปิดปรับปรุง',
            'status' => $room['status_name'],
            'room_name' => $room['room_name']
        ]);
        exit;
    }

    // ตรวจสอบว่าห้องถูกจองในช่วงเวลานี้หรือไม่
    // Booking status: 1 = ยืนยันแล้ว, 2 = รอยืนยัน, 3 = ยกเลิก
    // ต้องตรวจสอบเฉพาะที่ยังไม่ยกเลิก (status != 3)
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
    
    // ห้องจะว่างก็ต่อเมื่อ: ไม่ใช่ปิดปรับปรุง (status_id != 3) และไม่มีการจองในช่วงนี้
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
?>