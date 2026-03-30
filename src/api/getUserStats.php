<?php
session_start();
require_once __DIR__ . '/../config/config.php';
header("Content-Type: application/json");

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
    $currentDate = date('Y-m-d');
    $currentHour = intval(date('H'));
    $currentMinute = intval(date('i'));
    $currentTime = $currentHour + ($currentMinute / 100);
    $totalQuery = "
        SELECT COUNT(*) as total
        FROM Bookings
        WHERE user_id = ?
        AND YEAR(booking_date) = ?
    ";

    $totalStmt = $pdo->prepare($totalQuery);
    $totalStmt->execute([$userId, $currentYear]);
    $totalResult = $totalStmt->fetch(PDO::FETCH_ASSOC);

    $completedQuery = "
        SELECT COUNT(*) as completed
        FROM Bookings
        WHERE user_id = ?
        AND YEAR(booking_date) = ?
        AND status = 1
        AND (
            booking_date < ?
            OR (booking_date = ? AND end_time <= ?)
        )
    ";

    $completedStmt = $pdo->prepare($completedQuery);
    $completedStmt->execute([
        $userId, 
        $currentYear, 
        $currentDate,
        $currentDate,
        $currentTime
    ]);
    $completedResult = $completedStmt->fetch(PDO::FETCH_ASSOC);


    $cancelledQuery = "
        SELECT COUNT(*) as cancelled
        FROM Bookings
        WHERE user_id = ?
        AND YEAR(booking_date) = ?
        AND status = 2
    ";

    $cancelledStmt = $pdo->prepare($cancelledQuery);
    $cancelledStmt->execute([$userId, $currentYear]);
    $cancelledResult = $cancelledStmt->fetch(PDO::FETCH_ASSOC);

    echo json_encode([
        "status" => "success",
        "data" => [
            "total_bookings" => intval($totalResult['total']),
            "completed_bookings" => intval($completedResult['completed']),
            "cancelled_bookings" => intval($cancelledResult['cancelled'])
        ]
    ], JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    error_log("Database Error in getUserStats: " . $e->getMessage());
    echo json_encode([
        "status" => "error",
        "message" => "เกิดข้อผิดพลาดในการดึงข้อมูล: " . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    error_log("Error in getUserStats: " . $e->getMessage());
    echo json_encode([
        "status" => "error",
        "message" => "Error: " . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>