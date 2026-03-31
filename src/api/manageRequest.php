<?php
session_start();
date_default_timezone_set('Asia/Bangkok');
header("Content-Type: application/json");
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/Notification.php';

$input = json_decode(file_get_contents("php://input"), true);
$action    = $input['action']     ?? '';
$bookingId = $input['booking_id'] ?? 0;
$adminId   = $_SESSION['user_id'] ?? 0;

try {
    $stmt = $pdo->prepare("SELECT room_id, booking_date, start_time, end_time FROM Bookings WHERE booking_id = ? AND status = 3");
    $stmt->execute([$bookingId]);
    $pending = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$pending) {
        echo json_encode(["status" => "error", "message" => "ไม่พบคำขอนี้ หรือถูกจัดการไปแล้ว"]);
        exit;
    }

    $pdo->beginTransaction();

    if ($action === 'approve') {
        $executiveRoomId = $pending['room_id'];

        $overlapStmt = $pdo->prepare("
            SELECT booking_id, room_id, attendees_count FROM Bookings
            WHERE room_id = ? AND booking_date = ? AND status = 1
            AND (start_time < ? AND end_time > ?)
        ");
        $overlapStmt->execute([$executiveRoomId, $pending['booking_date'], $pending['end_time'], $pending['start_time']]);
        $overlaps = $overlapStmt->fetchAll(PDO::FETCH_ASSOC);

        $displacedBookings = [];
        if (!empty($overlaps)) {
            foreach ($overlaps as $overlap) {
                $pdo->prepare("
                    UPDATE Bookings 
                    SET status = 4,
                        is_moved = 1,
                        updated_at = NOW() 
                    WHERE booking_id = ?
                ")->execute([$overlap['booking_id']]);
            }
            $displacedBookings = $overlaps;
        }

        $pdo->prepare("UPDATE Bookings SET status = 1, updated_at = NOW() WHERE booking_id = ?")->execute([$bookingId]);

        $pdo->prepare("INSERT INTO Approval_Logs (booking_id, admin_id, action, created_at) VALUES (?, ?, 'approve', NOW())")
            ->execute([$bookingId, $adminId]);

        $pdo->commit();

        echo json_encode([
            "status"             => "success",
            "message"            => "อนุมัติคำขอสำเร็จ",
            "displaced_bookings" => $displacedBookings
        ]);
    } elseif ($action === 'reject') {
        $pdo->prepare("UPDATE Bookings SET status = 5, updated_at = NOW() WHERE booking_id = ?")->execute([$bookingId]);

        $pdo->prepare("
            UPDATE Equipment e
            JOIN Booking_Equipment be ON e.equipment_id = be.equipment_id
            SET e.quantity = e.quantity + be.quantity
            WHERE be.booking_id = ?
        ")->execute([$bookingId]);

        $pdo->prepare("INSERT INTO Approval_Logs (booking_id, admin_id, action, created_at) VALUES (?, ?, 'reject', NOW())")
            ->execute([$bookingId, $adminId]);

        $pdo->commit();
        echo json_encode(["status" => "success", "message" => "ปฏิเสธคำขอและคืนอุปกรณ์สำเร็จ"]);
    } else {
        echo json_encode(["status" => "error", "message" => "คำสั่งไม่ถูกต้อง"]);
    }
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    echo json_encode(["status" => "error", "message" => "System Error: " . $e->getMessage()]);
}
