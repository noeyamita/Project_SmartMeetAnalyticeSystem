<?php
session_start();
require_once __DIR__ . '/../config/config.php';
header("Content-Type: application/json");

// ฟังก์ชันแปลง Decimal -> HH:MM
function decimalToTime($decimal) {
    if ($decimal === null) return null;
    
    $hours = floor($decimal);
    $minutes = round(($decimal - $hours) * 100);
    
    return sprintf("%02d:%02d", $hours, $minutes);
}

try {
    $now = new DateTime();
    $currentDate = $now->format('Y-m-d');
    $currentTime = floatval($now->format('H')) + (floatval($now->format('i')) / 100);

    // ดึงข้อมูลห้องทั้งหมด
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
        
        // ตรวจสอบการจองในปัจจุบัน
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

        // กำหนดสถานะ
        $status = 'available';
        $statusInfo = '';

        if ($currentBooking) {
            $status = 'occupied';
            $endTime = decimalToTime($currentBooking['end_time']);
            $statusInfo = "ใช้งานจนถึง {$endTime}";
        } elseif ($upcomingBooking) {
            $status = 'reserved';
            $startTime = decimalToTime($upcomingBooking['start_time']);
            $statusInfo = "จองเวลา {$startTime}";
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
?>