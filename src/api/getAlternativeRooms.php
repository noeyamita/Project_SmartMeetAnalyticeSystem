<?php
session_start();
header("Content-Type: application/json");
require_once __DIR__ . '/../config/config.php';

$booking_id = isset($_GET['booking_id']) ? intval($_GET['booking_id']) : 0;

try {
    //ดึงข้อมูลการจองเดิมที่ถูกทับ
    $stmt = $pdo->prepare("SELECT room_id, booking_date, start_time, end_time, attendees_count FROM Bookings WHERE booking_id = ?");
    $stmt->execute([$booking_id]);
    $booking = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$booking) {
        echo json_encode(["status" => "error", "message" => "ไม่พบการจองนี้"]);
        exit;
    }
    $capacity = (int)$booking['attendees_count'];
    $oldRoomId = (int)$booking['room_id'];
    $bdate = $booking['booking_date'];
    $startTime = $booking['start_time'];
    $endTime = $booking['end_time'];

    $query = "
        SELECT r.room_id, r.room_name, r.capacity, r.floor_number
        FROM Meeting_Rooms r
        WHERE r.capacity >= :capacity
        AND r.room_id != :old_room_id
        AND r.open_time <= :start_time
        AND r.close_time >= :end_time
        AND NOT EXISTS (
            SELECT 1 FROM Bookings b 
            WHERE b.room_id = r.room_id 
            AND b.booking_date = :bdate 
            AND b.status = 1
            AND b.start_time < :end_time_check 
            AND b.end_time > :start_time_check
        )
        ORDER BY r.capacity ASC
        LIMIT 5
    ";

    $stmtRooms = $pdo->prepare($query);
    $stmtRooms->bindValue(':capacity', $capacity, PDO::PARAM_INT);
    $stmtRooms->bindValue(':old_room_id', $oldRoomId, PDO::PARAM_INT);
    $stmtRooms->bindValue(':start_time', $startTime, PDO::PARAM_STR);
    $stmtRooms->bindValue(':end_time', $endTime, PDO::PARAM_STR);
    $stmtRooms->bindValue(':bdate', $bdate, PDO::PARAM_STR);
    $stmtRooms->bindValue(':end_time_check', $endTime, PDO::PARAM_STR);
    $stmtRooms->bindValue(':start_time_check', $startTime, PDO::PARAM_STR);

    $stmtRooms->execute();
    $altRooms = $stmtRooms->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(["status" => "success", "data" => $altRooms]);
} catch (PDOException $e) {
    error_log("Get Alt Rooms Error: " . $e->getMessage());
    echo json_encode(["status" => "error", "message" => "Database error"]);
}
