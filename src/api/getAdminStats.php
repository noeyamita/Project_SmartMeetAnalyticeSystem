<?php
session_start();
require_once __DIR__ . '/../config/config.php';
header("Content-Type: application/json");

// ตรวจสอบสิทธิ์ Admin (ถ้ามี)
// if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'admin') {
//     echo json_encode([
//         "status" => "error",
//         "message" => "ไม่มีสิทธิ์เข้าถึง"
//     ]);
//     exit;
// }

try {
    // การจองวันนี้
    $todayQuery = "
        SELECT COUNT(*) as count
        FROM Bookings
        WHERE booking_date = CURDATE()
        AND status = 1
    ";
    $todayStmt = $pdo->query($todayQuery);
    $todayResult = $todayStmt->fetch(PDO::FETCH_ASSOC);

    // การจองสัปดาห์นี้
    $weekQuery = "
        SELECT COUNT(*) as count
        FROM Bookings
        WHERE YEARWEEK(booking_date, 1) = YEARWEEK(CURDATE(), 1)
        AND status = 1
    ";
    $weekStmt = $pdo->query($weekQuery);
    $weekResult = $weekStmt->fetch(PDO::FETCH_ASSOC);

    // การจองเดือนนี้
    $monthQuery = "
        SELECT COUNT(*) as count
        FROM Bookings
        WHERE YEAR(booking_date) = YEAR(CURDATE())
        AND MONTH(booking_date) = MONTH(CURDATE())
        AND status = 1
    ";
    $monthStmt = $pdo->query($monthQuery);
    $monthResult = $monthStmt->fetch(PDO::FETCH_ASSOC);

    // การยกเลิกเดือนนี้
    $cancelledQuery = "
        SELECT COUNT(*) as count
        FROM Bookings
        WHERE YEAR(booking_date) = YEAR(CURDATE())
        AND MONTH(booking_date) = MONTH(CURDATE())
        AND status = 2
    ";
    $cancelledStmt = $pdo->query($cancelledQuery);
    $cancelledResult = $cancelledStmt->fetch(PDO::FETCH_ASSOC);

    // การย้ายห้อง (นับจาก Booking_History ถ้ามี)
    // สมมติว่ามีตาราง Booking_History หรือใช้ฟิลด์อื่น
    // ถ้าไม่มี ให้ใส่ค่า 0 ไปก่อน
    $roomChanges = 0;

    echo json_encode([
        "status" => "success",
        "data" => [
            "today_bookings" => $todayResult['count'],
            "week_bookings" => $weekResult['count'],
            "month_bookings" => $monthResult['count'],
            "cancelled_bookings" => $cancelledResult['count'],
            "room_changes" => $roomChanges
        ]
    ]);

} catch (PDOException $e) {
    error_log("Database Error: " . $e->getMessage());
    echo json_encode([
        "status" => "error",
        "message" => "เกิดข้อผิดพลาดในการดึงข้อมูล"
    ]);
}
?>