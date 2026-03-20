<?php
session_start();
header("Content-Type: application/json");
require_once __DIR__ . '/../config/config.php';

$input = json_decode(file_get_contents("php://input"), true);
$booking_id = $input['booking_id'] ?? 0;
$new_room_id = $input['new_room_id'] ?? 0;

try {
    // ดึงรหัสห้องเก่ามาเก็บประวัติ
    $stmt = $pdo->prepare("SELECT room_id FROM Bookings WHERE booking_id = ?");
    $stmt->execute([$booking_id]);
    $old = $stmt->fetch(PDO::FETCH_ASSOC);
    $update = $pdo->prepare("
        UPDATE Bookings 
        SET room_id = :new_room, 
            status = 1, 
            is_moved = 1, 
            original_room_id = :old_room,
            updated_at = NOW()
        WHERE booking_id = :booking_id
    ");
    
    $update->execute([
        'new_room'   => $new_room_id,
        'old_room'   => $old['room_id'],
        'booking_id' => $booking_id
    ]);

    // อุปกรณ์ย้ายตาม booking_id
    echo json_encode(["status" => "success"]);

} catch(PDOException $e) {
    echo json_encode(["status" => "error", "message" => "Database Error"]);
}
?>