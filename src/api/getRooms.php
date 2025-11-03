<?php
header("Content-Type: application/json");
require_once __DIR__ . '/../config/config.php';

// ✅ ฟังก์ชันสำหรับแปลง Decimal Hour (9.00) -> HH:MM (09:00) ที่แก้ไข
function decimalToTime($decimal) {
    if (!is_numeric($decimal)) return null;
    $hours = floor($decimal);
    $minutes = round(($decimal - $hours) * 60); 

    if ($minutes >= 60) {
        $hours += floor($minutes / 60);
        $minutes = $minutes % 60;
    }
    $hours = $hours % 24; 
    
    return sprintf("%02d:%02d", $hours, $minutes);
}


try {
    $capacity = isset($_GET['capacity']) ? intval($_GET['capacity']) : 0;

    $sql = "
        SELECT 
            room_id,
            room_name,
            capacity,
            room_size,
            floor_number,
            status,
            image_url,
            description,
            open_time,
            close_time,
            created_at,
            updated_at
        FROM Meeting_Rooms
    ";

    if ($capacity > 0) {
        $sql .= " WHERE capacity >= :capacity ORDER BY capacity ASC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['capacity' => $capacity]);
    } else {
        $sql .= " ORDER BY room_id ASC";
        $stmt = $pdo->query($sql);
    }

    $rooms = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($rooms as &$room) {
        $room['status'] = isset($room['status']) ? (int)$room['status'] : 0;

        // ✅ แปลงค่าเวลาจาก decimal (9.00) -> HH:MM โดยใช้ฟังก์ชันที่ถูกต้อง
        if (!empty($room['open_time']) && is_numeric($room['open_time'])) {
            $room['open_time'] = decimalToTime($room['open_time']);
        }
        if (!empty($room['close_time']) && is_numeric($room['close_time'])) {
            $room['close_time'] = decimalToTime($room['close_time']);
        }

        // ✅ ถ้าไม่มีรูปภาพให้เป็น null
        $room['image_url'] = !empty($room['image_url']) ? $room['image_url'] : null;

        // ป้องกัน error จาก JS
        $room['facilities'] = [];
    }

    echo json_encode([
        "status" => "success",
        "data" => $rooms,
        "count" => count($rooms)
    ], JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    echo json_encode([
        "status" => "error",
        "message" => $e->getMessage()
    ]);
}
?>