<?php
session_start();
header("Content-Type: application/json; charset=utf-8");
require_once __DIR__ . '/../config/config.php'; 

$room_id = isset($_GET['room_id']) ? intval($_GET['room_id']) : 0;

if ($room_id <= 0) {
    echo json_encode(['status' => 'error', 'message' => 'รหัสห้องไม่ถูกต้อง']);
    exit;
}

try {
    $sql = "SELECT booking_id, room_id, booking_date, start_time, end_time, attendees_count, purpose 
            FROM Bookings 
            WHERE room_id = :room_id 
            AND status = 1 
            AND (booking_date > CURDATE() OR (booking_date = CURDATE() AND start_time >= CURTIME()))
            ORDER BY booking_date ASC, start_time ASC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([':room_id' => $room_id]);
    $affected_bookings = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (count($affected_bookings) > 0) {
        $update_sql = "UPDATE Bookings SET status = 3 
                       WHERE room_id = :room_id AND status = 1 
                       AND (booking_date > CURDATE() OR (booking_date = CURDATE() AND start_time >= CURTIME()))";
        $upd_stmt = $pdo->prepare($update_sql);
        $upd_stmt->execute([':room_id' => $room_id]);
        $queryRooms = "
            SELECT r.room_id, r.room_name, r.capacity, r.floor_number
            FROM Meeting_Rooms r
            WHERE r.capacity >= :capacity
            AND r.room_id != :old_room_id
            AND r.open_time <= :start_time
            AND r.close_time >= :end_time
            AND NOT EXISTS (
                SELECT 1 FROM Bookings b2 
                WHERE b2.room_id = r.room_id 
                AND b2.booking_date = :bdate 
                AND b2.status = 1
                AND b2.start_time < :end_time_check 
                AND b2.end_time > :start_time_check
            )
            ORDER BY r.capacity ASC
            LIMIT 5
        ";
        $stmtRooms = $pdo->prepare($queryRooms);

        foreach ($affected_bookings as &$booking) {
            $stmtRooms->bindValue(':capacity', (int)$booking['attendees_count'], PDO::PARAM_INT);
            $stmtRooms->bindValue(':old_room_id', (int)$booking['room_id'], PDO::PARAM_INT);
            $stmtRooms->bindValue(':start_time', $booking['start_time'], PDO::PARAM_STR);
            $stmtRooms->bindValue(':end_time', $booking['end_time'], PDO::PARAM_STR);
            $stmtRooms->bindValue(':bdate', $booking['booking_date'], PDO::PARAM_STR);
            $stmtRooms->bindValue(':end_time_check', $booking['end_time'], PDO::PARAM_STR);
            $stmtRooms->bindValue(':start_time_check', $booking['start_time'], PDO::PARAM_STR);
            
            $stmtRooms->execute();
            $altRooms = $stmtRooms->fetchAll(PDO::FETCH_ASSOC);
            
            $booking['alternative_rooms'] = $altRooms;
        }

    } else {
        echo json_encode([
            'status' => 'success',
            'message' => 'ไม่มีการจองค้างอยู่',
            'data' => []
        ]);
        exit;
    }

    echo json_encode([
        'status' => 'success',
        'count' => count($affected_bookings),
        'message' => 'เตรียมข้อมูลสำเร็จ',
        'data' => $affected_bookings
    ]);

} catch(PDOException $e) {
    echo json_encode(["status" => "error", "message" => "DB Error: " . $e->getMessage()]);
}
?>