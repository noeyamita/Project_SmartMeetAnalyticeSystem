<?php
session_start();
require_once __DIR__ . '/../config/config.php';
header("Content-Type: application/json");

try {
    $query = "
        SELECT 
            DAY(booking_date) as day,
            COUNT(*) as booking_count
        FROM Bookings
        WHERE YEAR(booking_date) = YEAR(CURDATE())
        AND MONTH(booking_date) = MONTH(CURDATE())
        AND status = 1
        GROUP BY DAY(booking_date)
        ORDER BY day ASC
    ";

    $stmt = $pdo->query($query);
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // แปลงเป็น integer
    $result = [];
    foreach ($data as $row) {
        $result[] = [
            'day' => intval($row['day']),
            'booking_count' => intval($row['booking_count'])
        ];
    }

    echo json_encode([
        "status" => "success",
        "data" => $result
    ]);
} catch (PDOException $e) {
    error_log("Database Error: " . $e->getMessage());
    echo json_encode([
        "status" => "error",
        "message" => "เกิดข้อผิดพลาดในการดึงข้อมูล"
    ]);
}
