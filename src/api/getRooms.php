<?php
header("Content-Type: application/json");
require_once __DIR__ . '/../config/config.php';

// เปิด error log (ลบออกหลังจาก debug เสร็จ)
error_log("=== getRooms.php called ===");
error_log("GET params: " . print_r($_GET, true));

try {
    // รับค่าจำนวนผู้เข้าร่วมจาก parameter ชื่อ capacity
    $capacity = isset($_GET['capacity']) ? intval($_GET['capacity']) : 0;

    error_log("Capacity value: " . $capacity);

    // ถ้ามีการส่งจำนวนผู้เข้าร่วมมา ให้แสดงเฉพาะห้องที่รองรับได้
    if ($capacity > 0) {
        $stmt = $pdo->prepare("
            SELECT room_id, room_name, capacity, room_size, floor_number, status, image_url,
                   description, open_time, close_time, created_at, updated_at
            FROM Meeting_Rooms
            WHERE capacity >= :capacity
            ORDER BY capacity ASC
        ");
        $stmt->execute(['capacity' => $capacity]);
        error_log("Query with filter: capacity >= " . $capacity);
    } else {
        // ถ้าไม่ส่งมาก็แสดงทั้งหมด
        $stmt = $pdo->query("
            SELECT room_id, room_name, capacity, room_size, floor_number, status, image_url,
                   description, open_time, close_time, created_at, updated_at
            FROM Meeting_Rooms
            ORDER BY room_id ASC
        ");
        error_log("Query without filter");
    }

    $rooms = $stmt->fetchAll(PDO::FETCH_ASSOC);
    error_log("Rooms found: " . count($rooms));
    
    if (count($rooms) > 0) {
        error_log("First room: " . print_r($rooms[0], true));
    }

    echo json_encode([
        "status" => "success", 
        "data" => $rooms,
        "count" => count($rooms),
        "filter_capacity" => $capacity
    ]);

} catch (PDOException $e) {
    error_log("ERROR: " . $e->getMessage());
    echo json_encode([
        "status" => "error", 
        "message" => $e->getMessage()
    ]);
}
?>