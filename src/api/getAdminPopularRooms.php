<?php
session_start();
require_once __DIR__ . '/../config/config.php';
header("Content-Type: application/json");

try {
    $query = "
        SELECT 
            r.room_id,
            r.room_name,
            COUNT(b.booking_id) as booking_count
        FROM Bookings b
        JOIN Meeting_Rooms r ON b.room_id = r.room_id
        WHERE YEAR(b.booking_date) = YEAR(CURDATE())
        AND MONTH(b.booking_date) = MONTH(CURDATE())
        AND b.status = 1
        GROUP BY r.room_id, r.room_name
        HAVING booking_count > 0
        ORDER BY booking_count DESC
        LIMIT 5
    ";

    $stmt = $pdo->query($query);
    $rooms = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "status" => "success",
        "data" => $rooms
    ]);
} catch (PDOException $e) {
    error_log("Database Error: " . $e->getMessage());
    echo json_encode([
        "status" => "error",
        "message" => "เกิดข้อผิดพลาดในการดึงข้อมูล"
    ]);
}
