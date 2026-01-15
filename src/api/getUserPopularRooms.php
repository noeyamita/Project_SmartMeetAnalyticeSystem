<?php
session_start();
require_once __DIR__ . '/../config/config.php';
header("Content-Type: application/json");

// ตรวจสอบการล็อกอิน
if (!isset($_SESSION['user_id'])) {
    echo json_encode([
        "status" => "error",
        "message" => "กรุณาเข้าสู่ระบบ"
    ]);
    exit;
}

try {
    $userId = $_SESSION['user_id'];
    $currentYear = date('Y');

    $query = "
        SELECT 
            r.room_id,
            r.room_name,
            COUNT(b.booking_id) as booking_count
        FROM Bookings b
        JOIN Meeting_Rooms r ON b.room_id = r.room_id
        WHERE b.user_id = :user_id
        AND YEAR(b.booking_date) = :current_year
        AND b.status = 1
        GROUP BY r.room_id, r.room_name
        HAVING booking_count > 0
        ORDER BY booking_count DESC
        LIMIT 5
    ";

    $stmt = $pdo->prepare($query);
    $stmt->execute([
        'user_id' => $userId,
        'current_year' => $currentYear
    ]);

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
?>